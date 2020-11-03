import * as EventEmitter from "eventemitter3";

import {Team, TeamedActor} from "../actors/TeamedActor";
import {Actor} from "../engine/Actor";
import {Sprite, Effect, SpriteConfig} from "../engine/components/Sprite";
import {Engine} from "../engine/Engine";
import {Loader, AssetTag} from "../engine/Loader";
import {Body} from "../engine/components/Body";
import {Random} from "../engine/Random";
import {DistributiveOmit} from "../Types";
import {Bullet} from "../actors/Bullet";
import {Vector} from "../engine/Vector";
import {ShapeGenerator} from "../engine/ShapeGenerator";
import {Explosion} from "../actors/Explosion";



let enemySmallTexture = Loader.addSpritesheet(
  require("../../assets/images/enemy-small.png"), {
    frames: {
      "1": { frame: {x: 0 * 12, y: 0 * 15, w: 12, h: 15} },
      "2": { frame: {x: 1 * 12, y: 0 * 15, w: 12, h: 15} },
      "3": { frame: {x: 0 * 12, y: 1 * 15, w: 12, h: 15} },
      "4": { frame: {x: 1 * 12, y: 1 * 15, w: 12, h: 15} }
    },
    animations: {
      "ship": ["1", "2", "3", "4"]
    }
  });


let enemyMedium1Texture = Loader.addSpritesheet(
  require("../../assets/images/enemy-medium-1.png"), {
    frames: {
      "ship-1": { frame: {x: 0 * 20, y: 0, w: 20, h: 21} },
      "ship-2": { frame: {x: 1 * 20, y: 0, w: 20, h: 21} },
      "bullet-1": { frame: { x: 0, y: 21, w: 3, h: 6} },
      "bullet-2": { frame: { x: 5, y: 21, w: 3, h: 6} }
    },
    animations: {
      "ship": ["ship-1", "ship-2"],
      "bullet": ["bullet-1", "bullet-2"]
    }
  });


interface EnemySpec {
  health: number;
  speed: [number, number];
  collisionDamage: number;

  sprite: DistributiveOmit<SpriteConfig, "position">;
  body: {
    asset: string;
    sprite: AssetTag;
    scale: Vector;
  };
  bullet: null | {
    maxStartEnergy: number;
    firingEnergy: number;
    rechargeRate: [number, number];

    position: Array<Vector>;

    damage: number;
    sprite: DistributiveOmit<SpriteConfig, "position">;
    body: {
      asset: string;
      sprite: AssetTag;
      scale: Vector;
    };
  };
};


let enemies: { [key: string]: EnemySpec } = {
  "small": {
    health: 1,
    speed: [6, 8.5],
    collisionDamage: 3,

    sprite: {
      kind: "animated",
      asset: enemySmallTexture,
      animation: "ship",
      scale: new Vector(3, 3),
      speed: 0.45
    },
    body: {
      asset: enemySmallTexture,
      sprite: "1",
      scale: new Vector(3, 3)
    },
    bullet: null
  },
  "medium-1": {
    health: 4,
    speed: [1.8, 2.4],
    collisionDamage: 2,

    sprite: {
      kind: "animated",
      asset: enemyMedium1Texture,
      animation: "ship",
      scale: new Vector(3, 3),
      speed: 0.7
    },
    body: {
      asset: enemyMedium1Texture,
      sprite: "ship-1",
      scale: new Vector(3, 3)
    },
    bullet: {
      maxStartEnergy: 4000,
      firingEnergy: 5000,
      rechargeRate: [0.4, 1],

      position: [new Vector(0, 10)],

      damage: 1,
      sprite: {
        kind: "animated",
        asset: enemyMedium1Texture,
        animation: "bullet",
        scale: new Vector(3, 3),
        speed: 0.35
      },
      body: {
        asset: enemyMedium1Texture,
        sprite: "bullet-1",
        scale: new Vector(3, 3)
      },
    }
  }
};


type Events = "destroyed" | "escaped";

export class Enemy extends TeamedActor {
  public readonly events = new EventEmitter<Events>();

  private body: Body;
  private health: number;
  private energy: number;
  private readonly rechargeRate: number;
  private readonly speed: number;

  private sprite: Sprite;
  private readonly spec: EnemySpec;

  public constructor(engine: Engine, position: Vector) {
    super("enemy", engine, Team.Enemy);

    let ship = "medium-1";
    this.spec = enemies[ship];

    this.body = new Body(engine, this, {
      shape: new ShapeGenerator().generateFromSpritesheet(
        engine, this.spec.body.asset, this.spec.body.sprite,
        this.spec.body.scale),
      position: position
    });
    this.body.events.on("collision", this.onCollision, this);
    this.add(this.body);

    this.sprite = new Sprite(engine, this, {
      ...this.spec.sprite,
      position: this.body
    });
    this.add(this.sprite);

    let bulletSpec = this.spec.bullet;
    if (bulletSpec != null) {
      this.energy = engine.random.int(0, bulletSpec.maxStartEnergy);
      this.rechargeRate = engine.random.real(
        bulletSpec.rechargeRate[0], bulletSpec.rechargeRate[1]);
    }
    else {
      this.energy = 0;
      this.rechargeRate = 0;
    }

    this.health = this.spec.health;
    this.speed = engine.random.real(this.spec.speed[0], this.spec.speed[1]);
  }

  public delete() {
    this.events.removeAllListeners();
  }


  public update(delta: number) {
    let movement = this.speed * delta / 1000;
    this.body.applyForce(new Vector(0, movement));

    if (!this.body.isOnScreen()) {
      this.events.emit("escaped", this);
      this.kill();
    }

    let bulletSpec = this.spec.bullet;
    if (bulletSpec != null) {
      this.energy = this.energy + (delta * this.rechargeRate);
      if (this.energy >= bulletSpec.firingEnergy) {
        this.fire();
        this.energy -= bulletSpec.firingEnergy;
      }
    }
  }


  private fire() {
    if (this.spec.bullet == null) {
      return;
    }

    for (let point of this.spec.bullet.position) {
      let p = point.clone();
      p.x *= this.spec.body.scale.x;
      p.y *= this.spec.body.scale.y;
      let bulletPoint = this.body.position.clone().add(p);

      this.engine.add(new Bullet(this.engine, {
        team: this.team,
        direction: new Vector(0, 0.006),
        position: bulletPoint,
        sprite: this.spec.bullet.sprite,
        damage: this.spec.bullet.damage,
        shape: new ShapeGenerator().generateFromSpritesheet(
          this.engine, this.spec.bullet.body.asset,
          this.spec.bullet.body.sprite,
          this.spec.bullet.body.scale)
      }));
    }
  }

  public damage(amount: number): boolean {
    let consume = this.alive;

    this.sprite.addEffect(Effect.FlashWhite);

    this.health -= amount;
    if (this.health <= 0) {
      this.events.emit("destroyed", this);
      this.engine.onNextUpdate(() => {
        this.kill();
        this.engine.add(new Explosion(this.engine, this.body.position));
      });
    }

    return consume;
  }

  public receivesBulletDamage() {
    return true;
  }

  private onCollision(other: Actor) {
    if (other instanceof TeamedActor && other.team != this.team) {
      other.damage(this.spec.collisionDamage);
    }
  }
}
