export abstract class TouchControl {
  abstract show(): void;
  abstract getValue(): any;
}

export class VirtualJoystick extends TouchControl {
  base: HTMLDivElement;
  nub: HTMLDivElement;

  constructor() {
    super();

    this.base = document.createElement("div");
    this.base.style.width = "1.5in";
    this.base.style.height = "1.5in";
    this.base.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
    this.base.style.zIndex = "3";
    this.base.style.borderRadius = "50%";
    this.base.style.position = "absolute";
    this.base.style.left = "10px";
    this.base.style.bottom = "10px";
    this.base.style.display = "none";

    this.nub = document.createElement("div");
    this.nub.style.width = "0.5in";
    this.nub.style.height = "0.5in";
    this.nub.style.backgroundColor = "rgba(255, 255, 255, 1.0)";
    this.nub.style.zIndex = "4";
    this.nub.style.borderRadius = "50%";
    this.nub.style.pointerEvents = "none";
    this.nub.style.position = "absolute";
    this.nub.style.transform = "translate(-50%, -50%)";
    this.nub.style.display = "none";

    document.body.appendChild(this.base);
    document.body.appendChild(this.nub);

    this.base.addEventListener("touchstart", (event) => {
      let touch = event.targetTouches[0];
      this.updateTouch(touch);
    });

    this.base.addEventListener("touchmove", (event) => {
      let touch = event.targetTouches[0];
      this.updateTouch(touch);
    });

    this.base.addEventListener("touchend", (event) => {
      let touch = event.targetTouches[0];
      this.updateTouch();
    });
  }

  show() {
    this.base.style.display = "inherit";
    this.nub.style.display = "inherit";
    this.updateTouch();
  }

  value: { x: number; y: number } = { x: 0, y: 0 };

  updateTouch(touch?: Touch) {
    let rect = this.base.getBoundingClientRect();

    if (touch) {
      let pos = {
        x: 2 * ((touch.clientX - rect.left) / rect.width - 0.5),
        y: 2 * ((touch.clientY - rect.top) / rect.height - 0.5),
      };

      let length = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
      if (length > 1) {
        pos.x = pos.x / length;
        pos.y = pos.y / length;
      }

      this.value = { x: pos.x, y: -pos.y };

      this.nub.style.left = `${(pos.x / 2 + 0.5) * rect.width + rect.left}px`;
      this.nub.style.top = `${(pos.y / 2 + 0.5) * rect.height + rect.top}px`;
    } else {
      this.nub.style.left = `${0.5 * rect.width + rect.left}px`;
      this.nub.style.top = `${0.5 * rect.height + rect.top}px`;
      this.value = { x: 0, y: 0 };
    }
  }

  getValue(): { x: number; y: number } {
    return this.value;
  }
}
