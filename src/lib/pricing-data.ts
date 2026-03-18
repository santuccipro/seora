export const TOKEN_PACKS = [
  {
    id: "pack-5",
    name: "Starter",
    tokens: 5,
    price: 499,
    priceDisplay: "4,99 \u20ac",
    description: "5 analyses compl\u00e8tes",
    popular: false,
  },
  {
    id: "pack-15",
    name: "Pro",
    tokens: 15,
    price: 999,
    priceDisplay: "9,99 \u20ac",
    description: "15 analyses compl\u00e8tes",
    popular: true,
  },
  {
    id: "pack-50",
    name: "Expert",
    tokens: 50,
    price: 2499,
    priceDisplay: "24,99 \u20ac",
    description: "50 analyses compl\u00e8tes",
    popular: false,
  },
] as const;
