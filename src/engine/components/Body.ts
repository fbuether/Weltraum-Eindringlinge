import * as px from "pixi.js";
import * as planck from "planck-js";
import {Shape as planckShape} from "planck-js/lib/shape/index";
import * as EventEmitter from "eventemitter3";

import {Engine} from "../../engine/Engine";
import {Vector} from "../../engine/Vector";
import {Positioned} from "../../engine/components/Positioned";
import {Deletable} from "../../engine/components/Deletable";
import {Actor} from "../../engine/Actor";


export class Body extends Deletable implements Positioned {
  private body: planck.Body;
  private engine: Engine;
  private eventEmitter: EventEmitter<"collision">;

  // Getter/Setter from the outside, so game-scale values.
  get position(): Vector {
    return this.body.getPosition().clone().mul(1 / Engine.PhysicsScale);
  }

  set position(position: Vector) {
    let phyPosition = position.clone().mul(Engine.PhysicsScale);
    this.body.setPosition(phyPosition);
  }


  constructor(engine: Engine, shape: planckShape, position: Vector) {
    super();
    this.engine = engine;
    this.eventEmitter = new EventEmitter<"collision">();

    let phyPosition = position.clone().mul(Engine.PhysicsScale);
    this.body = engine.physics.createBody({
      type: "dynamic",
      position: phyPosition
    });

    this.body.createFixture(shape);
  }

  public onDelete() {
    this.eventEmitter.removeAllListeners();
  }


  public applyForce(direction: Vector): void {
    let phyForce = direction.mul(Engine.PhysicsScale);
    this.body.applyForceToCenter(phyForce, true);
  }


  public moveBy(delta: Vector): void {
    let phyDelta = delta.mul(Engine.PhysicsScale);
    this.body.setTransform(this.body.getPosition().add(phyDelta), 0);
  }


  public isOnScreen(): boolean {
    let screenBounds = this.engine.getScreenBounds();

    let fixture = this.body.getFixtureList();
    while (fixture != null) {
      if (planck.AABB.testOverlap(screenBounds, fixture.getAABB(0))) {
        return true;
      }

      fixture = fixture.getNext();
    }

    return false;
  }

  public onCollision(handler: (other: Actor) => void) {
    this.eventEmitter.on("collision", handler);
  }
}
