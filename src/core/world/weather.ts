import { Temperature } from "core/temperature";
import { params } from "game/params";
import { clamp, randInt } from "math";
import { SUNLIGHT_DIFFUSION, SUNLIGHT_REINTRODUCTION, TIME_PER_DAY } from "../constants";
import { Air } from "../tile";
import { World } from "./world";

const SUNLIGHT_TEMPERATURE_SCALAR = {
  [Temperature.Freezing]: 0.5,
  [Temperature.Cold]: 0.75,
  [Temperature.Mild]: 1,
  [Temperature.Hot]: 1.25,
  [Temperature.Scorching]: 1.5,
};
/**
 * WeatherController is responsible for weather related properties, such as:
 *
 * Temperature of the environment
 * Sunlight amount and angle
 * Rainfall
 */
export class Weather {
  constructor(public world: World) {}

  /**
   * The day is further split into a "daytime" and a "nighttime". Sunlight
   * angles from -90 to +90 over the course of the day. This percentage says
   * how much of a full day is filled with sun.
   *
   * Balance-wise, we keep it daytime often because daytime is more fun; nighttime
   * is just a time-keeping convenience, and a way to reset the sun angle.
   */
  get percentDaylight() {
    const { season } = this.world.season;
    return this.world.environment.daylightPerSeason[season];
  }

  /**
   * 0 to 2pi, where
   * 0 to pi: daytime (time of day - 0 to PERCENT_DAYLIGHT)
   * pi to 2pi: nighttime (PERCENT_DAYLIGHT to 1)
   */
  get sunAngle() {
    if (params.forceNight) {
      return (Math.PI * 3) / 2;
    }
    const timeOfDay = (this.world.time / TIME_PER_DAY) % 1;
    const percentDaylight = this.percentDaylight;
    if (timeOfDay < percentDaylight) {
      return (timeOfDay / percentDaylight) * Math.PI;
    } else {
      return Math.PI * (1 + (timeOfDay - percentDaylight) / (1 - percentDaylight));
    }
  }

  get sunAmount() {
    const temperatureScalar = SUNLIGHT_TEMPERATURE_SCALAR[this.getBaseTemperature()];
    const baseAmount = (Math.atan(Math.sin(this.sunAngle) * 12) / (Math.PI / 2)) * 0.5 + 0.5;
    return baseAmount * temperatureScalar;
  }

  getBaseTemperature() {
    const { season } = this.world.season;
    return this.world.environment.temperaturePerSeason[season];
  }

  getCurrentTemperature() {
    const temperature = this.getBaseTemperature();
    // temperature gets one tick colder at night
    if (this.sunAngle > Math.PI) {
      return clamp(temperature - 1, Temperature.Freezing, Temperature.Scorching) as Temperature;
    } else {
      return temperature;
    }
  }

  step(dt: number) {
    this.computeSunlight();
    this.stepWeather(dt);
  }

  public stepWeather(dt: number) {
    const world = this.world;
    // offset first rain event by a few seconds
    const isRaining =
      (world.time + world.environment.climate.timeBetweenRainfall - 6) % world.environment.climate.timeBetweenRainfall <
      world.environment.climate.rainDuration;
    if (isRaining) {
      // add multiple random droplets
      let numWater = world.environment.climate.waterPerSecond * dt;
      let guard = 0;
      while (numWater > 0 && guard++ < 100) {
        const dropletSize = clamp(numWater, 0, 1);
        const x = randInt(0, world.width - 1);
        const t = world.tileAt(x, 0);
        if (Air.is(t)) {
          t.inventory.add(dropletSize, 0);
          world.numRainWater += dropletSize;
          numWater -= dropletSize;
        }
      }
    }
  }

  public computeSunlight() {
    // step downards from the top; neighbors don't affect the calculation so
    // we don't have buffering problems
    // TODO allow sunlight to go full 45-to-90 degrees
    const sunAngle = this.sunAngle;
    const directionalBias = Math.sin(sunAngle - Math.PI / 2);
    const sunAmount = this.sunAmount;
    for (let y = 0; y <= this.world.height; y++) {
      for (let x = 0; x < this.world.width; x++) {
        const t = this.world.environmentTileAt(x, y);
        if (Air.is(t)) {
          let sunlight = 0;
          if (y === 0) {
            sunlight = 1;
          } else {
            const tileUp = this.world.tileAt(x, y - 1);
            const tileRight = this.world.tileAt(x + 1, y - 1);
            const tileLeft = this.world.tileAt(x - 1, y - 1);
            const upSunlight = Air.is(tileUp) ? tileUp.sunlightCached / sunAmount : tileUp == null ? 1 : 0;
            const rightSunlight = Air.is(tileRight) ? tileRight.sunlightCached / sunAmount : tileRight == null ? 1 : 0;
            const leftSunlight = Air.is(tileLeft) ? tileLeft.sunlightCached / sunAmount : tileLeft == null ? 1 : 0;
            if (directionalBias > 0) {
              // positive light travels to the right
              sunlight = rightSunlight * directionalBias + upSunlight * (1 - directionalBias);
            } else {
              sunlight = leftSunlight * -directionalBias + upSunlight * (1 - -directionalBias);
            }
            sunlight =
              sunlight * (1 - SUNLIGHT_DIFFUSION) +
              ((upSunlight + rightSunlight + leftSunlight) / 3) * SUNLIGHT_DIFFUSION;
          }
          // have at least a bit
          sunlight = SUNLIGHT_REINTRODUCTION + sunlight * (1 - SUNLIGHT_REINTRODUCTION);
          sunlight *= sunAmount;
          t.sunlightCached = sunlight;
        }
      }
    }
  }
}
