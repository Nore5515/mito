import { sleep } from "common/promise";
import { EventOof } from "core/tile/tileEvent";
import { easeSinInOut } from "d3-ease";
import Keyboard from "game/input/keyboard";
import { WorldDOMElement } from "game/mito/WorldDOMElement";
import { InventoryBar } from "game/ui/ingame/InventoryBar";
import React from "react";
import { Color, DoubleSide, Mesh, MeshBasicMaterial, PlaneBufferGeometry, Scene, Vector2 } from "three";
import { Player } from "../../core";
import { Action, ActionBuild, ActionLong } from "../../core/player/action";
import { Tile } from "../../core/tile";
import { clamp, lerp2, map, randFloat } from "../../math";
import {
  build,
  buildComplete,
  deconstruct,
  dropSugar,
  dropWater,
  footsteps,
  interactSound,
  moveBumped,
  sticky,
} from "../audio";
import { Mito } from "../mito/mito";
import { textureFromSpritesheet } from "../spritesheet";
import NeuronMesh, { darkPink, playerTeal } from "./neuronMesh";
import "./PlayerRenderer.scss";
import { Renderer } from "./Renderer";
import { also, Animation, AnimationController, animPause, chain } from "./tile/Animation";

export class PlayerRenderer extends Renderer<Player> {
  public mesh: Mesh;

  public neuronMesh = new NeuronMesh(8);

  protected animation = new AnimationController();

  constructor(target: Player, scene: Scene, mito: Mito) {
    super(target, scene, mito);
    this.mesh = newMesh();
    this.mesh.name = "Player Mesh";
    lerp2(this.mesh.position, this.target.pos, 1);
    this.mesh.position.z = 2;
    this.mesh.add(this.neuronMesh);

    // wait a bit so the player doesn't pop out behind the seed
    sleep(300).then(() => {
      this.scene.add(this.mesh);
    });

    // TODO unregister these!
    this.target.on("start-long-action", this.handleStartLongAction);
    this.target.on("action", this.handleAction);
    this.target.on("action-fail", this.handlePlayerActionFail);
    // this.target.inventory.on("get", this.handleResourceGet);
    this.target.inventory.on("change", this.handleResourceChange);
  }

  private resourceText?: {
    element: WorldDOMElement;
    water: number;
    sugar: number;
    position: Vector2;
    timeoutId: number;
  };

  // handleResourceGet = (from: Inventory, w: number, s: number) => {
  //   this.handleResourceAdd(w, s);
  // };

  handleResourceChange = (w: number, s: number) => {
    const positionFn = () => this.resourceText!.position;
    const renderFn = () => {
      const { water, sugar } = this.resourceText!;
      // const { water, sugar } = this.target.inventory;
      const sign = water > 0 || sugar > 0 ? "+" : null;
      return (
        <div className="player-resource-popup">
          {sign}
          <InventoryBar water={water} sugar={sugar} showBar={false} format="icons" capacity={100} colored={false} />
        </div>
      );
    };
    if (this.resourceText == null) {
      this.resourceText = {
        element: this.mito.addWorldDOMElement(positionFn, renderFn),
        position: this.target.posFloat.clone(),
        water: w,
        sugar: s,
        timeoutId: (setTimeout(() => {
          this.mito.removeWorldDOMElement(this.resourceText!.element);
          delete this.resourceText;
        }, 1500) as unknown) as number,
      };
    } else {
      if (Math.sign(this.resourceText.water) !== Math.sign(w) || Math.sign(this.resourceText.sugar) !== Math.sign(s)) {
        this.resourceText.water = 0;
        this.resourceText.sugar = 0;
      }
      this.resourceText.position.copy(this.target.posFloat);
      this.resourceText.water += w;
      this.resourceText.sugar += s;
      this.mito.removeWorldDOMElement(this.resourceText.element);
      this.resourceText.element = this.mito.addWorldDOMElement(positionFn, renderFn);
      clearTimeout(this.resourceText.timeoutId);
      this.resourceText.timeoutId = (setTimeout(() => {
        this.mito.removeWorldDOMElement(this.resourceText!.element);
        delete this.resourceText;
      }, 1500) as unknown) as number;
    }
  };

  handleStartLongAction = (action: ActionLong) => {
    if (action.effect.type === "build") {
      this.animation.set(this.buildReproducerAnimation(action as ActionLong<ActionBuild>));
    }
  };

  handleAction = (action: Action) => {
    if (action.type === "pickup") {
      this.neuronMesh.handleInteracted();
      interactSound.fade(0.5, 0.0, 200);
      interactSound.rate(randFloat(0.8, 1.5));
    } else if (action.type === "drop") {
      if (action.sugar > 0) {
        dropSugar.play();
        dropSugar.rate(randFloat(0.8, 1.2));
      }
      if (action.water > 0) {
        if (!dropWater.playing()) {
          const id = dropWater.play();
          dropWater.fade(0.2, 0, 400, id);
          dropWater.rate(randFloat(0.8, 1.5));
        }
      }
    } else if (action.type === "build") {
      if (action.cellType.chromosome.computeStaticProperties().timeToBuild >= 0) {
        const id = build.play();
        build.rate(randFloat(0.5, 1.0), id);
      } else {
        const id = buildComplete.play();
        buildComplete.rate(id, randFloat(0.5, 1));
      }
    } else if (action.type === "deconstruct") {
      const id = deconstruct.play();
      deconstruct.rate(randFloat(0.9, 1.1), id);
    } else if (action.type === "move") {
      footsteps.fade(0.1, 0, 50);
      footsteps.rate(randFloat(0.8, 1.5));
    }
  };

  handlePlayerActionFail = (action: Action, message?: string) => {
    if (action.type === "move") {
      if (!moveBumped.playing()) {
        moveBumped.play();
        moveBumped.rate(randFloat(0.8, 1.2));
      }
    }
    if (message == null) {
      if (action.type === "pickup" && this.target.inventory.isMaxed()) {
        message = "Inventory full!";
      }
      // else if (action.type === "drop" && action.target && action.target.inventory.isMaxed()) {
      //   message = `${action.target.displayName} inventory full!`;
      // }
    }

    if (message != null) {
      if (action.continuous) {
        // only show an error if it's not the exact same error that already exists
        if (this.mito.invalidAction?.message !== message) {
          this.mito.showInvalidAction({ message });
        }
      } else {
        this.mito.showInvalidAction({ message });
      }
    }
  };

  private prevHighlightedTile?: Tile;

  update() {
    const pos = this.target.droopPosFloat().clone();

    const oof = this.target.world.getLastStepStats().events.oof[0] as EventOof;
    if (oof) {
      this.mito.addFloatingText(pos, "oof");
    }

    this.mesh.position.set(pos.x, pos.y, 2);

    const dt = 1 / 60;
    const isUsingShift = Keyboard.keyMap.has("ShiftLeft");
    const isInteract = (this.mito.controls?.wouldLeftClickInteract() ?? false) && !isUsingShift;
    const highlight = this.mito.highlightedTile;
    const neuronMeshTarget = isInteract ? highlight!.pos.clone().sub(pos) : ZERO;
    if (this.prevHighlightedTile !== highlight) {
      const id = sticky.play();
      sticky.rate(randFloat(0.9, 1.1), id);
      sticky.volume(randFloat(0.8, 1), id);
    }
    this.neuronMesh.setColor(this.mito.toolBar.interactTool.isTakeAll ? darkPink : playerTeal);
    this.neuronMesh.update(isInteract ? dt * 10 : dt * 5, neuronMeshTarget);
    this.prevHighlightedTile = highlight;
    // this.neuronMesh.visible = Cell.is(this.mito.getHighlightedTile());

    // pos.x += Math.cos(Ticker.now / 1000) * 0.04;
    // pos.y += Math.sin(Ticker.now / 400) * 0.08;
    // lerp2(this.mesh.position, pos, 0.5);

    this.animation.update();
  }

  destroy() {
    this.scene.remove(this.mesh);
  }

  buildReproducerAnimation(actionLong: ActionLong<ActionBuild>): Animation {
    const animWaitForCameraZoomIn = animPause(0.5);
    let w = 0;
    const animShakeDuration = 1.5;
    const animShake: Animation = (t, dt) => {
      const tNorm = t / animShakeDuration;
      // const pow = clamp(polyBiasUpDown(tNorm), 0, 1);
      const pow = clamp(tNorm, 0, 1);
      const shakeFrequency = 9 * Math.sqrt(pow);
      const shakeAmplitude = 0.15 * pow ** 1.5;
      w += dt * Math.PI * 2 * shakeFrequency;
      this.mesh.position.x += Math.sin(w) * shakeAmplitude;
      return tNorm > 1;
    };
    const animPulse: Animation = (t) => {
      const tNorm = t / 0.25;
      const s = map(clamp(4 * (tNorm - tNorm * tNorm), 0, 1), 0, 1, 1, 1.5);
      this.mesh.scale.set(s, s, 1);
      return t > tNorm;
    };
    const animSendCopy = this.animSendCopy(actionLong.effect.position);
    const animWaitEnd = animPause(0.5);

    const focusCamera: Animation = () => {
      this.mito.suggestCamera({
        center: this.target.posFloat,
        zoom: 3,
      });
      return false;
    };

    return also(chain(animWaitForCameraZoomIn, animShake, also(animSendCopy, animPulse), animWaitEnd), focusCamera);
  }

  animSendCopy(target: Vector2): Animation {
    const copy = newMesh();
    copy.scale.x = this.mesh.scale.x * 1;
    copy.scale.y = this.mesh.scale.y * 1;
    copy.position.z = this.mesh.position.z - 0.01;
    this.scene.add(copy);
    const animDuplicate: Animation = (t) => {
      const tNorm = t / 0.5;
      const dX = easeSinInOut(tNorm) * 0.5;
      this.mesh.position.x -= dX;
      lerp2(copy.position, this.target.droopPosFloat(), 1);
      copy.position.x += dX;
      return tNorm > 1;
    };
    const animStayLeft: Animation = (t) => {
      this.mesh.position.x -= 0.5;
      return false;
    };
    const animReturnOriginal: Animation = (t) => {
      const tNorm = t / 0.5;
      const dX = easeSinInOut(1 - tNorm) * 0.5;
      this.mesh.position.x -= dX;
      return tNorm > 1;
    };
    const animShrinkAndMove: Animation = (t, dt) => {
      const tNorm = t / 1.2;
      // lerp2(copy.position, this.mesh.position, 1);
      lerp2(copy.position, target, 0.1);
      // lerp2(copy.position, target, easeExpOut(tNorm));
      // lerp2(copy.scale, { x: this.mesh.scale.x, y: this.mesh.scale.y }, 1);
      // lerp2(copy.scale, { x: this.mesh.scale.x * 0.2, y: this.mesh.scale.y * 0.2 }, easeSinInOut(tNorm));
      lerp2(copy.scale, { x: this.mesh.scale.x * 0.2, y: this.mesh.scale.y * 0.2 }, 0.1);
      return tNorm > 1;
    };
    const animShrinkToZeroAndRemove: Animation = (t) => {
      const tNorm = t / 0.5;
      lerp2(copy.scale, { x: this.mesh.scale.x * 0.2, y: this.mesh.scale.y * 0.2 }, 1);
      lerp2(copy.scale, { x: 0, y: 0 }, easeSinInOut(tNorm));

      const ended = tNorm > 1;
      if (ended) {
        this.scene.remove(copy);
      }
      return ended;
    };
    return chain(
      animDuplicate,
      also(animPause(0.5), animStayLeft),
      also(animShrinkAndMove, animReturnOriginal),
      animShrinkToZeroAndRemove
    );
  }
}

function newMesh() {
  const m = new Mesh(
    new PlaneBufferGeometry(0.75, 0.75),
    new MeshBasicMaterial({
      transparent: true,
      // depthWrite: false,
      // depthTest: false,
      map: textureFromSpritesheet(3, 2, "transparent"),
      color: new Color("white"),
      side: DoubleSide,
    })
  );
  m.renderOrder = 9;
  return m;
}

const ZERO = new Vector2();
