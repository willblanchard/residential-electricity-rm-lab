const PRESENTATION_NAV_ITEMS = [
  { page: "index", href: "index.html", label: "Summary / Intro" },
  { page: "wtp", href: "wtp-segmentation.html", label: "WTP + Segmentation" },
  { page: "optimization", href: "optimization-model.html", label: "Optimization Model" },
  { page: "implementation", href: "implementation-validation.html", label: "Implementation" },
  { page: "energy", href: "energy-capacity-costs.html", label: "Energy + Capacity" },
  { page: "population", href: "population.html", label: "Population" },
  { page: "single-price", href: "phase1.html", label: "Single Price Results" },
  { page: "parallel-options", href: "phase2.html", label: "Parallel Options Results" },
  { page: "limitations", href: "limitations-future-work.html", label: "Limitations" },
  { page: "takeaway", href: "final-takeaway.html", label: "Takeaway" },
];

class RmSiteHeader extends HTMLElement {
  connectedCallback() {
    const activePage = this.getAttribute("page") || "";
    const subtitle = this.getAttribute("subtitle") || "";

    const navMarkup = PRESENTATION_NAV_ITEMS.map((item) => {
      const isActive = item.page === activePage;
      const activeAttrs = isActive ? ' class="active" aria-current="page"' : "";
      return `<a${activeAttrs} href="${item.href}">${item.label}</a>`;
    }).join("");

    this.innerHTML = `
      <header class="topbar">
        <div class="topbar-inner">
          <div class="brand">
            <div class="mark" aria-hidden="true">RM</div>
            <div>
              <p class="brand-title">Residential Electricity RM Lab</p>
              <p class="brand-subtitle">${subtitle}</p>
            </div>
          </div>
          <nav class="page-nav presentation-nav" aria-label="presentation pages">
            ${navMarkup}
          </nav>
        </div>
      </header>
    `;
  }
}

customElements.define("rm-site-header", RmSiteHeader);
