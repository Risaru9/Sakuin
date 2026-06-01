export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export class CircuitBreaker {
  private state: CircuitBreakerState = "CLOSED";
  private failureCount = 0;
  private nextAttemptTime = 0;

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly cooldownMs: number = 30000 // 30 detik
  ) {}

  public getState(): CircuitBreakerState {
    this.updateState();
    return this.state;
  }

  private updateState() {
    if (this.state === "OPEN" && Date.now() >= this.nextAttemptTime) {
      this.state = "HALF_OPEN";
      console.log(`[CircuitBreaker] Circuit transitioned from OPEN to HALF_OPEN (cooldown elapsed)`);
    }
  }

  public async execute<T>(
    fn: () => Promise<T>,
    fallback: (error: Error) => T | Promise<T>
  ): Promise<T> {
    this.updateState();

    if (this.state === "OPEN") {
      const waitTimeRemaining = Math.max(0, Math.ceil((this.nextAttemptTime - Date.now()) / 1000));
      console.warn(`[CircuitBreaker] Circuit is OPEN. Failing fast. Time remaining: ${waitTimeRemaining}s`);
      return fallback(new Error(`Circuit is OPEN. Fast fallback active. Coba lagi dalam ${waitTimeRemaining} detik.`));
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      return fallback(error as Error);
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === "HALF_OPEN") {
      this.state = "CLOSED";
      console.log(`[CircuitBreaker] Circuit transitioned from HALF_OPEN to CLOSED (successful request executed)`);
    }
  }

  private onFailure(error: Error) {
    this.failureCount++;
    console.error(`[CircuitBreaker] Request failed. Count: ${this.failureCount}/${this.failureThreshold}. Error:`, error.message);

    if (this.state === "CLOSED" && this.failureCount >= this.failureThreshold) {
      this.trip();
    } else if (this.state === "HALF_OPEN") {
      this.trip();
    }
  }

  private trip() {
    this.state = "OPEN";
    this.nextAttemptTime = Date.now() + this.cooldownMs;
    console.warn(`[CircuitBreaker] Circuit transitioned to OPEN. Blocked for next ${this.cooldownMs / 1000}s`);
  }
}

export const aiCircuitBreaker = new CircuitBreaker(5, 30000);
