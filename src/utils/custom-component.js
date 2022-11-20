export class CustomComponent extends HTMLElement {
  /**
   *
   * @param {Object} config Configuration for this CustomComponent
   * @param {string} config.displayName Name to be used when logging the component lifecycle
   */
  constructor({ displayName }) {
    super();
    this.displayName = displayName;
  }

  connectedCallback() {
    console.log(`${this.displayName} is getting mounted`);
    this.render();
  }

  disconnectedCallback() {
    console.log(`${this.displayName} is getting dismounted`);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log(`${name} changed from ${oldValue} to ${newValue}`);
    this.render();
  }

  /**
   * Returns element's first attribute whose qualified name is qualifiedName,
   * and false if there is no such attribute otherwise.
   * @param {string} qualifiedName
   * @returns If the boolean attribute is present
   */
  getBooleanAttribute(qualifiedName) {
    const attribute = this.getAttribute(qualifiedName);
    return attribute === qualifiedName || attribute === "";
  }

  render() {
    throw new Error("The render method is not implemented");
  }
}
