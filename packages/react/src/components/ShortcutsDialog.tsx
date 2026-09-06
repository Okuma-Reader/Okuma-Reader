import keyArrowLeft from "@okuma-reader/core/assets/keyboard/keyboard_arrow_left_outline.svg?url";
import keyArrowRight from "@okuma-reader/core/assets/keyboard/keyboard_arrow_right_outline.svg?url";
import keyPageUp from "@okuma-reader/core/assets/keyboard/keyboard_page_up_outline.svg?url";
import keyPageDown from "@okuma-reader/core/assets/keyboard/keyboard_page_down_outline.svg?url";
import keyCtrl from "@okuma-reader/core/assets/keyboard/keyboard_ctrl_outline.svg?url";
import keyEscape from "@okuma-reader/core/assets/keyboard/keyboard_escape_outline.svg?url";
import keyF from "@okuma-reader/core/assets/keyboard/keyboard_f_outline.svg?url";
import keyQuestion from "@okuma-reader/core/assets/keyboard/keyboard_question_outline.svg?url";
import mouseScrollUp from "@okuma-reader/core/assets/keyboard/mouse_scroll_up_outline.svg?url";
import mouseScrollDown from "@okuma-reader/core/assets/keyboard/mouse_scroll_down_outline.svg?url";
import mouseScrollVertical from "@okuma-reader/core/assets/keyboard/mouse_scroll_vertical_outline.svg?url";
import { Icon } from "./Icon";

const key = (url: string) => ({ ["--key" as string]: `url(${JSON.stringify(url)})` });

export function ShortcutsDialog() {
  return (
    <dialog id="shortcuts-dialog" aria-labelledby="shortcuts-title">
      <div className="shortcuts-panel">
        <div className="shortcuts-header">
          <h2 id="shortcuts-title">Keyboard shortcuts</h2>
          <button type="button" data-shortcuts-close aria-label="Close" className="icon-button">
            <Icon name="close" />
          </button>
        </div>

        <section className="shortcuts-group">
          <h3>Navigation</h3>
          <table className="shortcuts-table">
            <tbody>
              <tr>
                <th scope="row" aria-label="Left arrow, Page Up, or scroll up">
                  <span className="shortcut-keys" aria-hidden="true">
                    <span className="shortcut-key" style={key(keyArrowLeft)} />
                    <span className="or">or</span>
                    <span className="shortcut-key" style={key(keyPageUp)} />
                    <span className="or">or</span>
                    <span className="shortcut-key" style={key(mouseScrollUp)} />
                  </span>
                </th>
                <td>Previous pages</td>
              </tr>
              <tr>
                <th scope="row" aria-label="Right arrow, Page Down, or scroll down">
                  <span className="shortcut-keys" aria-hidden="true">
                    <span className="shortcut-key" style={key(keyArrowRight)} />
                    <span className="or">or</span>
                    <span className="shortcut-key" style={key(keyPageDown)} />
                    <span className="or">or</span>
                    <span className="shortcut-key" style={key(mouseScrollDown)} />
                  </span>
                </th>
                <td>Next pages</td>
              </tr>
              <tr>
                <th scope="row" aria-label="Control plus Left arrow">
                  <span className="shortcut-keys" aria-hidden="true">
                    <span className="shortcut-key" style={key(keyCtrl)} />
                    <span className="plus">+</span>
                    <span className="shortcut-key" style={key(keyArrowLeft)} />
                  </span>
                </th>
                <td>Previous chapter</td>
              </tr>
              <tr>
                <th scope="row" aria-label="Control plus Right arrow">
                  <span className="shortcut-keys" aria-hidden="true">
                    <span className="shortcut-key" style={key(keyCtrl)} />
                    <span className="plus">+</span>
                    <span className="shortcut-key" style={key(keyArrowRight)} />
                  </span>
                </th>
                <td>Next chapter</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="shortcuts-group">
          <h3>Fullscreen</h3>
          <table className="shortcuts-table">
            <tbody>
              <tr>
                <th scope="row" aria-label="F">
                  <span className="shortcut-keys" aria-hidden="true">
                    <span className="shortcut-key" style={key(keyF)} />
                  </span>
                </th>
                <td>Toggle fullscreen</td>
              </tr>
              <tr>
                <th scope="row" aria-label="Escape">
                  <span className="shortcut-keys" aria-hidden="true">
                    <span className="shortcut-key" style={key(keyEscape)} />
                  </span>
                </th>
                <td>Exit fullscreen</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="shortcuts-group">
          <h3>Others</h3>
          <table className="shortcuts-table">
            <tbody>
              <tr>
                <th scope="row" aria-label="Control plus scroll">
                  <span className="shortcut-keys" aria-hidden="true">
                    <span className="shortcut-key" style={key(keyCtrl)} />
                    <span className="plus">+</span>
                    <span className="shortcut-key" style={key(mouseScrollVertical)} />
                  </span>
                </th>
                <td>Zoom</td>
              </tr>
              <tr>
                <th scope="row" aria-label="Control plus F">
                  <span className="shortcut-keys" aria-hidden="true">
                    <span className="shortcut-key" style={key(keyCtrl)} />
                    <span className="plus">+</span>
                    <span className="shortcut-key" style={key(keyF)} />
                  </span>
                </th>
                <td>Find in book</td>
              </tr>
              <tr>
                <th scope="row" aria-label="Question mark">
                  <span className="shortcut-keys" aria-hidden="true">
                    <span className="shortcut-key" style={key(keyQuestion)} />
                  </span>
                </th>
                <td>Keyboard shortcuts</td>
              </tr>
            </tbody>
          </table>
        </section>

        <p className="shortcuts-note">On a Mac, ⌘ works in place of Ctrl.</p>
      </div>
    </dialog>
  );
}
