document.addEventListener("DOMContentLoaded", () => {
  /* -------------------- ДАННЫЕ -------------------- */
  const providers = [
    { name: "Водоканал", img: "./images/vodokonal.png", code: "water" },
    { name: "Теплосеть", img: "./images/teploset.png", code: "heating" },
    { name: "Тазалык", img: "./images/tazalyk.png", code: "sewerage" },
    { name: "Электричество", img: "./images/electricity.png", code: "electricity" },
    { name: "Газпром", img: "./images/gazprom.png", code: "gas" },
  ];
  const API_URL = "https://ners.billing.kg/ws/public/api/v1/clients/temp/estate";
  const username = "admin-fr";
  const password = "admin";
  const basicAuth = "Basic " + btoa(`${username}:${password}`);

  /* -------------------- ЭЛЕМЕНТЫ -------------------- */
  const listContainer = document.getElementById("providers-list");
  const selectedSection = document.getElementById("selected-provider");
  const form = document.querySelector(".form");
  let input = document.getElementById("form-input"); // будет пересоздаваться
  let submitBtn = document.querySelector(".form-button");

  // Модалка
  const modal = document.getElementById("modal");
  const modalTitleEl = document.getElementById("modal-title");
  const modalTextEl = document.getElementById("modal-text");

  const logoEl = document.querySelector("header img");
  if (logoEl) {
    logoEl.style.cursor = "pointer";
    logoEl.addEventListener("click", () => {
      window.location.reload();
    });
  }

  const openModal = (title = "Ошибка", text = "Произошла ошибка") => {
    if (modalTitleEl) modalTitleEl.textContent = title;
    if (modalTextEl) modalTextEl.textContent = text;
    modal.classList.add("is-open");
  };

  const closeModal = () => modal.classList.remove("is-open");

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target.hasAttribute("data-close")) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  /* -------------------- ИСТОРИЯ БРАУЗЕРА -------------------- */
  let currentState = "main"; // 'main' | 'payment'

  // Добавляем состояние в историю браузера
  const pushState = (state) => {
    currentState = state;
    history.pushState({ state }, "", window.location.href);
  };

  // Обработчик кнопки "Назад" браузера
  window.addEventListener("popstate", (event) => {
    if (event.state && event.state.state === "main") {
      // Возвращаемся на главную страницу
      returnToMain();
    } else if (currentState === "payment") {
      // Если находимся в разделе оплаты и нажали "Назад", возвращаемся на главную
      returnToMain();
    }
  });

  // Функция возврата на главную страницу
  const returnToMain = () => {
    window.location.reload();
  };

  /* -------------------- ВЫБОР ПРОВАЙДЕРА -------------------- */
  const userSelection = { providerCode: null };

  // Рендер карточек провайдеров
  providers.forEach((p) => {
    const card = document.createElement("div");
    card.className = "provider-card";
    card.dataset.providerCode = p.code;
    const img = document.createElement("img");
    img.src = p.img;
    img.alt = p.name;
    const label = document.createElement("p");
    label.textContent = p.name;
    card.append(img, label);
    listContainer.appendChild(card);
  });

  // Обработка выбора провайдера
  listContainer.querySelectorAll(".provider-card").forEach((card) => {
    card.addEventListener("click", () => {
      listContainer.querySelectorAll(".provider-card").forEach((el) => el.classList.remove("selected"));
      card.classList.add("selected");
      userSelection.providerCode = card.dataset.providerCode;
      selectedSection.style.display = "flex";
    });
  });

  if (window.innerWidth <= 768) {
    const inputField = document.getElementById("form-input");
    const providersSection = document.querySelector(".welcome");
    const selectedProvider = document.getElementById("selected-provider");
    inputField?.addEventListener("focus", () => {
      if (providersSection && selectedProvider) {
        providersSection.classList.add("hidden");
        selectedProvider.classList.add("active");
        selectedProvider.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
    inputField?.addEventListener("blur", () => {
      setTimeout(() => {
        if (providersSection && selectedProvider) {
          providersSection.classList.remove("hidden");
          selectedProvider.classList.remove("active");
        }
      }, 200);
    });
  }

  /* -------------------- АКТИВАЦИЯ КНОПКИ SUBMIT -------------------- */
  input.addEventListener("input", () => {
    submitBtn.disabled = input.value.trim() === "";
  });

  /* -------------------- ЛОКАЛЬНОЕ ХРАНИЛИЩЕ ДЛЯ СОХРАНЕНИЯ ИСТОРИИ -------------------- */
  const saveStateToStorage = (providerCode, account, data) => {
    localStorage.setItem("providerCode", providerCode);
    localStorage.setItem("account", account);
    localStorage.setItem("clientData", JSON.stringify(data));
  };

  const loadStateFromStorage = () => {
    const providerCode = localStorage.getItem("providerCode");
    const account = localStorage.getItem("account");
    const clientData = localStorage.getItem("clientData");
    return {
      providerCode,
      account,
      clientData: clientData ? JSON.parse(clientData) : null,
    };
  };

  const clearStateFromStorage = () => {
    localStorage.removeItem("providerCode");
    localStorage.removeItem("account");
    localStorage.removeItem("clientData");
  };

  const restoreState = () => {
    const { providerCode, account, clientData } = loadStateFromStorage();
    if (providerCode && account && clientData) {
      listContainer.querySelectorAll(".provider-card").forEach((card) => {
        if (card.dataset.providerCode === providerCode) {
          card.classList.add("selected");
        } else {
          card.classList.add("disabled");
          card.style.pointerEvents = "none";
        }
      });
      userSelection.providerCode = providerCode;
      selectedSection.style.display = "flex";
      replaceInputWithStatic(account);
      renderClientInfo(clientData, account);
      if (submitBtn) submitBtn.disabled = true;
    }
  };

  /* -------------------- ВСПОМОГАТЕЛЬНЫЕ -------------------- */
  const replaceInputWithStatic = (accountValue) => {
    const wrapper = document.createElement("div");
    wrapper.className = "form-input-static";
    wrapper.innerHTML = `
      <p>Лицевой счёт</p>
      <p>${accountValue}</p>
    `;
    input.replaceWith(wrapper);
  };

  const replaceButtonWithMessage = () => {
    submitBtn.outerHTML = `
      <div class="form-success-msg">
        Проверьте данные и перейдите к оплате
      </div>
    `;
  };

  function renderClientInfo(data, fallbackAccount) {
    let info = document.getElementById("client-info");
    if (info) info.remove();
    const singleAccount = data?.singleAccount || fallbackAccount || "";
    const address = data?.address || "";
    const fullName = data?.fullName || "";
    const period = data?.period || "";
    const debt = data?.debt || "";
    const html = `
      <div id="client-info" class="client-info">
        <div>
          <p>Единый лицевой счёт</p>
          <p>${singleAccount}</p>
        </div>
        <div>
          <p>Адрес</p>
          <p>${address}</p>
        </div>
        <div>
          <p>Плательщик</p>
          <p>${fullName}</p>
        </div>
        <div class="client-info__actions">
          <button type="button" class="btn-pay">Перейти к оплате</button>
          <button type="button" class="btn-reset">Другой лицевой счёт</button>
        </div>
      </div>
    `;
    const msg = form.querySelector(".form-success-msg");
    if (msg) {
      msg.insertAdjacentHTML("afterend", html);
    } else {
      form.insertAdjacentHTML("beforeend", html);
    }

    document.addEventListener(
      "click",
      (e) => {
        if (e.target.classList.contains("btn-reset")) {
          resetFormState();
        }
        if (e.target.classList.contains("btn-pay")) {
          const period = data?.period || "";
          const debt = data?.debt || "";
          const deeplinkURL = data?.deeplinkURL || null;
          const downloadURLPdf = data?.downloadURLPdf || null;
          const openURLPdf = data?.openURLPdf || null;
          const qrURL = data?.qrURL || null;
          showPaymentSection({ period, debt, deeplinkURL, downloadURLPdf, openURLPdf, qrURL });
        }
      },
      { once: false }
    );
  }

  function showPaymentSection(data) {
    document.body.innerHTML = `
      <div class="container-payment">
        <header>
          <img src="./images/logo.svg" alt="Header Logo" class="header-logo" />
          <button type="button" class="btn-back">Назад</button>
        </header>
        <div class="payment-page">
          <div class="info">
            <div class="info-data">
              <p class="title">Расчётный месяц</p>
              <p class="data">${data.period || "—"}</p>
            </div>
            <div class="info-data">
              <p class="title">Сумма к оплате</p>
              <p class="data">${data.debt || "—"}</p>
            </div>
          </div>
          ${
            data.qrURL
              ? `
            <div class="qr-section">
              <img src="${data.qrURL}" alt="QR-код" id="qr-image" />
              <div class="button-container">
                <button type="button" class="button-qr" id="save-qr">Сохранить QR</button>
                <button type="button" class="button-qr" id="download-qr">Скачать QR</button>
              </div>
            </div>
          `
              : ""
          }
          <div class="actions-buttons">
            <button type="button" class="btn-pay-main">Оплатить</button>
            ${
              data.downloadURLPdf
                ? `
              <button type="button" class="open">Открыть квитанцию</button>
              <button type="button" class="download" id="download-pdf">Скачать квитанцию</button>
            `
                : ""
            }
          </div>
        </div>
      </div>
    `;

    // Переходим в состояние "payment"
    pushState("payment");

    document.querySelectorAll(".header-logo").forEach((logo) => {
      logo.style.cursor = "pointer";
      logo.addEventListener("click", () => {
        returnToMain();
      });
    });

    const downloadQrBtn = document.getElementById("download-qr");
    if (downloadQrBtn) {
      downloadQrBtn.addEventListener("click", async () => {
        const qrImage = document.getElementById("qr-image");
        if (!qrImage) return;

        try {
          const originalUrl = qrImage.src;

          // Отправляем в Flutter оригинальную ссылку
          if (window.flutter_inappwebview) {
            window.flutter_inappwebview.callHandler("onDownloadQr", originalUrl);
          }

          // Дополнительно "скачать" картинку в браузере
          const link = document.createElement("a");
          link.href = originalUrl;
          link.download = "qr-code.png";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (err) {
          console.error("Ошибка при скачивании QR:", err);
          alert("Не удалось скачать QR. Попробуйте снова.");
        }
      });
    }

    // Кнопка "Назад" — вернуться на главную
    const backBtn = document.querySelector(".btn-back");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        returnToMain(); // используем ту же функцию, что и для браузерной кнопки "Назад"
      });
    }

    // Скачать PDF
    const downloadBtn = document.getElementById("download-pdf");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => {
        const link = document.createElement("a");
        link.href = data.downloadURLPdf;
        link.download = "Квитанция.pdf";
        document.body.appendChild(link);
        // Отправляем ссылку в Flutter
        if (window.flutter_inappwebview) {
          window.flutter_inappwebview.callHandler("onDownload", link.href);
        }
        link.click();
        document.body.removeChild(link);
      });
    }

    const saveQrBtn = document.getElementById("save-qr");
    if (saveQrBtn) {
      saveQrBtn.addEventListener("click", async () => {
        const qrImage = document.getElementById("qr-image");
        if (!qrImage) return;

        try {
          const originalUrl = qrImage.src;

          // Отправляем в Flutter оригинальную ссылку
          if (window.flutter_inappwebview) {
            window.flutter_inappwebview.callHandler("onDownloadQr", originalUrl);
          }

          // Если хочешь ещё и "скачать" картинку как файл:
          const link = document.createElement("a");
          link.href = originalUrl;
          link.download = "qr-code.png";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (err) {
          console.error("Ошибка сохранения QR:", err);
          alert("Не удалось сохранить QR. Попробуйте снова.");
        }
      });
    }

    const openBtn = document.querySelector(".open");

    if (openBtn) {
      openBtn.addEventListener("click", () => {
        // Выбираем корректную ссылку
        const pdfLink = data.openURLPdf || data.downloadURLPdf;

        // Открываем PDF в новом окне
        if (pdfLink) {
          window.open(pdfLink, "_blank");

          // Отправляем ссылку в Flutter
          if (window.flutter_inappwebview && typeof window.flutter_inappwebview.callHandler === "function") {
            window.flutter_inappwebview.callHandler("onOpenPdf", pdfLink);
          }
        } else {
          console.error("Ссылка на PDF не задана!");
        }
      });
    }

    // Кнопка "Оплатить"
    const payActionBtn = document.querySelector(".btn-pay-main");
    if (payActionBtn) {
      payActionBtn.addEventListener("click", () => {
        if (data?.deeplinkURL) {
          window.open(data.deeplinkURL, "_blank");
        } else {
          alert("Ссылка на оплату не найдена");
        }
      });
    }
  }

  /* -------------------- ОТПРАВКА ФОРМЫ -------------------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!userSelection.providerCode) {
      alert("Пожалуйста, выберите поставщика услуг.");
      return;
    }
    const account = input.value.trim();
    if (!account) {
      alert("Введите корректный лицевой счёт.");
      return;
    }
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = "Подождите...";
    submitBtn.disabled = true;
    const body = { typeSupplier: userSelection.providerCode, account };
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: basicAuth,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        alert(text || `Ошибка запроса (HTTP ${response.status})`);
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = account.trim() === "";
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (typeof data?.code !== "undefined" && Number(data.code) === 0) {
        openModal("Лицевой счёт не найден", "Перепроверьте данные и попробуйте снова.");
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = account.trim() === "";
        return;
      }
      replaceButtonWithMessage();
      const accountToShow = data?.singleAccount || account;
      replaceInputWithStatic(accountToShow);
      renderClientInfo(data, accountToShow);

      // Сохраняем в localStorage для истории
      saveStateToStorage(userSelection.providerCode, accountToShow, data);

      // блокируем выбор провайдера до шага "другой лицевой счёт"
      listContainer.querySelectorAll(".provider-card").forEach((card) => {
        if (!card.classList.contains("selected")) {
          card.classList.add("disabled");
        }
        card.style.pointerEvents = "none";
      });
    } catch (err) {
      console.error("Network error:", err);
      alert(err?.message || "Ошибка сети. Попробуйте снова.");
      submitBtn.textContent = originalBtnText;
      submitBtn.disabled = account.trim() === "";
    }
  });
// asasas
  /* -------------------- ИНИЦИАЛИЗАЦИЯ -------------------- */
  // Устанавливаем начальное состояние в истории браузера
  history.replaceState({ state: "main" }, "", window.location.href);

  /* -------------------- ВОССТАНОВЛЕНИЕ СОСТОЯНИЯ ПРИ ЗАГРУЗКЕ -------------------- */
  restoreState();

  /* -------------------- СБРОС ФОРМЫ -------------------- */
  const resetFormState = () => {
    clearStateFromStorage();

    if (!form) return;
    const info = document.getElementById("client-info");
    if (info) info.remove();

    const msg = form.querySelector(".form-success-msg");
    if (msg) msg.remove();

    if (!document.getElementById("form-input")) {
      const inputEl = document.createElement("input");
      inputEl.type = "text";
      inputEl.id = "form-input";
      inputEl.className = "form-input";
      inputEl.placeholder = "Лицевой счёт";
      inputEl.required = true;
      const staticBlock = form.querySelector(".form-input-static");
      if (staticBlock) staticBlock.replaceWith(inputEl);
      input = document.getElementById("form-input");
      input.addEventListener("input", () => {
        submitBtn.disabled = input.value.trim() === "";
      });
    } else {
      input.value = "";
      submitBtn.disabled = true;
    }

    if (!form.querySelector(".form-button")) {
      const btn = document.createElement("button");
      btn.type = "submit";
      btn.className = "form-button";
      btn.textContent = "Подтвердить";
      btn.disabled = true;
      form.appendChild(btn);
      submitBtn = form.querySelector(".form-button");
    }

    listContainer.querySelectorAll(".provider-card").forEach((card) => {
      card.classList.remove("disabled");
      card.style.pointerEvents = "";
    });

    selectedSection.style.display = "flex";
    currentState = "main"; // сбрасываем состояние
  };
});
