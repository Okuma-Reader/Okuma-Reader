import { CustomComponent } from "/utils/custom-component.js";

class MyButton extends CustomComponent {
  constructor() {
    super({ displayName: "MyButton" });
  }

  static get observedAttributes() {
    return ["text", "disabled"];
  }

  get text() {
    return this.getAttribute("text");
  }

  get disabled() {
    return this.getBooleanAttribute("disabled");
  }

  render() {
    this.innerHTML = `<button ${this.disabled ? "disabled" : ""}>${this.text}</button>`;
  }
}

customElements.define("my-button", MyButton);
