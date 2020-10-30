
import {Actor} from "../engine/Actor";
import {Body} from "../engine/components/Body";
import {Engine} from "../engine/Engine";
import {Loader} from "../engine/Loader";
import {Sprite} from "../engine/components/Sprite";

import {Vector} from "../engine/Vector";
import {ShapeGenerator} from "../engine/ShapeGenerator";


let texture = Loader.addSpritesheet(
  require("../../assets/images/bullet.png"), {
    frames: {
      "bullet-1": { frame: {x: 3, y: 3, w: 6, h: 21 } },
      "bullet-2": { frame: {x: 15, y: 3, w: 6, h: 21 } },
      "bullet-3": { frame: {x: 27, y: 3, w: 6, h: 21 } }
    },
    animations: {
      "bullet": ["bullet-1", "bullet-2", "bullet-3"]
    }
  });


export class Bullet extends Actor {
  private body: Body;

  public constructor(engine: Engine, position: Vector, direction: Vector) {
    super("bullet", engine);

    let sprite = new Sprite(engine, this, texture, "bullet-1");
    this.add(sprite);

    this.body = new Body(engine, this,
      new ShapeGenerator().generateFromTexture(sprite.texture), position, true);
    this.body.applyForce(direction);

    this.body.onCollision(this.onCollision.bind(this));
    this.add(this.body);

    sprite.attachTo(this.body);
  }

  private onCollision(other: Actor) {
    other.kill();
    this.kill();
  }

  public update(delta: number) {
    if (!this.body.isOnScreen()) {
      this.kill();
    }
  }
}
