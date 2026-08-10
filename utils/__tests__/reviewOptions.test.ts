import { getSupportedSpirits, getSupportedTypes } from "@/utils/reviewOptions";

describe("review options", () => {
  it("returns one each of Vodka, Gin, and Vesper in the product order", () => {
    const spirits = [
      { id: 4, name: "Tequila" },
      { id: 3, name: "Vesper" },
      { id: 2, name: "Gin" },
      { id: 22, name: " gin " },
      { id: 5, name: "Whiskey" },
      { id: 1, name: "Vodka" },
      { id: 11, name: "VODKA" },
    ];

    expect(getSupportedSpirits(spirits)).toEqual([
      { id: 1, name: "Vodka" },
      { id: 2, name: "Gin" },
      { id: 3, name: "Vesper" },
    ]);
  });

  it("returns the martini type set in the product order", () => {
    const types = [
      { id: 5, name: "Dry" },
      { id: 3, name: "Espresso" },
      { id: 2, name: "Dirty" },
      { id: 22, name: " dirty " },
      { id: 1, name: "Twist" },
      { id: 33, name: "ESPRESSO" },
      { id: 8, name: "50/50" },
      { id: 9, name: "Filthy" },
      { id: 11, name: "Classic" },
      { id: 7, name: "Lemon Twist" },
    ];

    expect(getSupportedTypes(types)).toEqual([
      { id: 11, name: "Classic" },
      { id: 5, name: "Dry" },
      { id: 8, name: "50/50" },
      { id: 1, name: "Twist" },
      { id: 2, name: "Dirty" },
      { id: 9, name: "Filthy" },
      { id: 3, name: "Espresso" },
    ]);
  });
});
