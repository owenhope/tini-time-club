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

  it("returns one each of Twist, Dirty, and Espresso in the product order", () => {
    const types = [
      { id: 5, name: "Dry" },
      { id: 3, name: "Espresso" },
      { id: 2, name: "Dirty" },
      { id: 22, name: " dirty " },
      { id: 6, name: "Gibson" },
      { id: 1, name: "Twist" },
      { id: 33, name: "ESPRESSO" },
      { id: 7, name: "Lemon Twist" },
    ];

    expect(getSupportedTypes(types)).toEqual([
      { id: 1, name: "Twist" },
      { id: 2, name: "Dirty" },
      { id: 3, name: "Espresso" },
    ]);
  });
});
