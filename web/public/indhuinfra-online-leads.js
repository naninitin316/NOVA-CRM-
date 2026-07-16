(function () {
  var config = window.indhuCrmLeadConfig || {};
  var apiBase = (config.apiBase || "http://localhost:3001/api").replace(/\/$/, "");
  var company = config.company || "INDHU Infra";
  var source = config.source || "indhuinfra.com Contact Form 7";
  var sentForms = new WeakSet();

  function getValue(form, selectors) {
    for (var i = 0; i < selectors.length; i += 1) {
      var field = form.querySelector(selectors[i]);
      if (field && typeof field.value === "string" && field.value.trim()) {
        return field.value.trim();
      }
    }
    return "";
  }

  async function forwardLead(form) {
    if (!form || sentForms.has(form)) return;

    var payload = {
      company: company,
      name: getValue(form, ['input[name="your-name"]', 'input[name="name"]']),
      email: getValue(form, ['input[name="your-email"]', 'input[name="email"]']),
      phone: getValue(form, ['input[name="Phone"]', 'input[name="phone"]', 'input[type="tel"]']),
      message: getValue(form, ['textarea[name="your-message"]', 'textarea[name="message"]']),
      project: document.title || "Website enquiry",
      source: source,
    };

    sentForms.add(form);

    try {
      var response = await fetch(apiBase + "/online-leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        sentForms.delete(form);
        console.error("CRM online lead sync failed.", await response.text());
      }
    } catch (error) {
      sentForms.delete(form);
      console.error("CRM online lead sync failed.", error);
    }
  }

  document.addEventListener("wpcf7mailsent", function (event) {
    forwardLead(event.target);
  });
})();
