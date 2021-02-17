/**
 * Expontentially weighted moving average and standard deviation.
 * Can be used for measuring values like ping.
 */
export default class EWMASD {
  discount: number;

  est_average: number;
  est_variance: number;

  initialized: boolean;

  constructor(discount: number) {
    this.discount = discount;

    this.est_average = 0;
    this.est_variance = 0;

    this.initialized = false;
  }

  update(measurement: number) {
    if (!this.initialized) {
      this.est_average = measurement;
      this.initialized = true;
    } else {
      let delta = measurement - this.est_average;
      this.est_variance =
        (1 - this.discount) *
        (this.est_variance + this.discount * delta * delta);
      this.est_average =
        this.discount * measurement + (1 - this.discount) * this.est_average;
    }
  }

  average() {
    return this.est_average;
  }
  variance() {
    return this.est_variance;
  }
  stddev() {
    return Math.sqrt(this.est_variance);
  }
}
