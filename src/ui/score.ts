import * as ex from "excalibur";


export class Score extends ex.ScreenElement {
  private display: HTMLElement;

  private ty = "score!";

  public constructor() {
    super();
    this.display = document.createElement("div");
  }

  public onInitialize(engine: ex.Engine) {
    this.display.className = "score";
    document.getElementById("ui")?.appendChild(this.display);
  }

  public onScoreChanged(newScore: number) {
    this.display.textContent = `Score ${newScore}`;
  }

  public onPreKill(scene: ex.Scene) {
    document.getElementById("ui")?.removeChild(this.display);
  }
}
