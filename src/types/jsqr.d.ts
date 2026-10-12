// jsqr paketi kendi TS tiplerini içermiyor; minimal bir tip tanımı.
declare module "jsqr" {
  interface Point {
    x: number;
    y: number;
  }
  interface QRCode {
    binaryData: number[];
    data: string;
    chunks: unknown[];
    location: {
      topLeftCorner: Point;
      topRightCorner: Point;
      bottomLeftCorner: Point;
      bottomRightCorner: Point;
    };
  }
  function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: { inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst" }
  ): QRCode | null;
  export default jsQR;
}
