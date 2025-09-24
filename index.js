document.addEventListener("DOMContentLoaded", () => {
  /* -------------------- ДАННЫЕ -------------------- */
  const providers = [
    { name: "Водоканал", img: "./images/vodokonal.png", code: "water" },
    { name: "Теплосеть", img: "./images/teploset.png", code: "heating" },
    { name: "Тазалык", img: "./images/tazalyk.png", code: "sewerage" },
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

    const resetBtn = document.querySelector(".btn-reset");
    resetBtn.addEventListener("click", () => {
      resetFormState();
    });

    const payBtn = document.querySelector(".btn-pay");
    payBtn.addEventListener("click", () => {
      const main = document.querySelector("main");
      const hasPdf = Boolean(data?.downloadURLPdf);

      const parseDebt = (v) => {
        if (v == null) return NaN;
        const n = parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
        return Number.isFinite(n) ? n : NaN;
      };

      const debtValue = parseDebt(data?.debt);
      const isBlocked = Number.isFinite(debtValue) && (debtValue <= 0 || debtValue > 300000);

      if (!hasPdf) {
        const welcome = document.querySelector(".welcome");
        if (welcome) welcome.style.display = "none";
        selectedSection.style.display = "none";

        const errorSection = document.createElement("section");
        errorSection.className = "payment-info payment-info--error";
        errorSection.innerHTML = `
          <h1>Квитанция не найдена</h1>
          <p>К сожалению что-то пошло не так. Повторите попытку позже.</p>
          <button class="back-to-input">Ввести лицевой счёт</button>
        `;
        main.appendChild(errorSection);

        const backBtn = errorSection.querySelector(".back-to-input");
        backBtn.addEventListener("click", () => {
          errorSection.remove();
          if (welcome) welcome.style.display = "";
          selectedSection.style.display = "flex";
          resetFormState();
          selectedSection.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return;
      }

      main.innerHTML = `
        <section class="payment-info">
          <h1>Квитанция готова</h1>
          <div class="payment-info__actions">
            <button class="open">Открыть квитанцию</button>
            <button id="download-pdf" class="btn-secondary">
              <img src="./images/pdf.svg" />
              <p>Скачать PDF</p>
            </button>
          </div>
          <h2>Вы можете оплатить её через QR</h2>
          <div class="payment-info__detail">
            <div><p>Единый лицевой счёт</p><p>${singleAccount}</p></div>
            <div><p>Адрес</p><p>${address}</p></div>
            <div><p>Плательщик</p><p>${fullName}</p></div>
            <div><p>Период</p><p>${period}</p></div>
            <div><p>Задолженность (сом)</p><p>${data?.debt ?? ""}</p></div>
          </div>
          ${
            !isBlocked
              ? `
            <div class="payment-info__qr-block">
              <div class="payment-info__qr">
                <ol>
                  <li>Откройте приложение банка</li>
                  <li>Откройте сканер QR</li>
                  <li>Отсканируйте данный QR-код</li>
                  <li>Подтвердите оплату</li>
                </ol>
                <div class="qr-wrapper">
                  <img id="qr-image" src="${data.qrCodeURL || ""}" alt="QR-код для оплаты" />
                  <button id="download-qr" class="btn-secondary"> Скачать </button>
                </div>
              </div>
            </div>
            <div class="payment-info__footer">
              <div class="payment-info__buttons">
                <button class="btn-back">Назад</button>
                <button class="btn-pay-main">Оплатить</button>
              </div>
              <p>
                Внимание! Оплата производится по единому лицевому счёту за всех поставщиков. Вы выбираете поставщика только для просмотра деталей по нему.
              </p>
            </div>
          `
              : `<div class="payment-info__blocked">
                <p>Оплата недоступна: переплата, 0 сом или сумма свыше 300 000 сом. Для уточнения обратитесь в свою обслуживающую организацию по г. Токмок.</p>
              </div>`
          }
        </section>
      `;
//????????????????????? Скачать QR
      // 📥 Скачать QR
const qrDownloadBtn = document.getElementById("download-qr");
if (qrDownloadBtn) {
  qrDownloadBtn.addEventListener("click", async () => {
    const qrImage = document.getElementById("qr-image");
    if (!qrImage || !qrImage.src) return;

    try {
      const originalUrl = qrImage.src;

      // 👉 Отправляем оригинальную ссылку в Flutter
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
          window.location.reload(); // возвращаем на главную
        });
      }

      // Скачать PDF (привяжется, только если кнопка есть в DOM)
      const downloadBtn = document.getElementById("download-pdf");
      if (downloadBtn) {
        downloadBtn.addEventListener("click", () => {
          const link = document.createElement("a");
          link.href = data.downloadURLPdf;
          link.download = "Квитанция.pdf";
          document.body.appendChild(link);
          // 👉 Отправляем ссылку в Flutter
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

          // 👉 Отправляем в Flutter оригинальную ссылку
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
    });
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
  };
});
