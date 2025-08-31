import type { Constellation, Star } from "../types/constellation";

// Major stars with their celestial coordinates
const stars: Star[] = [
    // Ursa Major (Big Dipper) stars
    {
        id: "dubhe",
        name: "Dubhe",
        rightAscension: 11.062,
        declination: 61.751,
        magnitude: 1.79,
        distance: 123,
        spectralClass: "K0III",
        color: "#FFB366",
    },
    {
        id: "merak",
        name: "Merak",
        rightAscension: 11.031,
        declination: 56.382,
        magnitude: 2.37,
        distance: 79.7,
        spectralClass: "A1V",
        color: "#D5E0FF",
    },
    {
        id: "phecda",
        name: "Phecda",
        rightAscension: 11.897,
        declination: 53.695,
        magnitude: 2.44,
        distance: 83.2,
        spectralClass: "A0V",
        color: "#D5E0FF",
    },
    {
        id: "megrez",
        name: "Megrez",
        rightAscension: 12.257,
        declination: 57.033,
        magnitude: 3.31,
        distance: 58.4,
        spectralClass: "A3V",
        color: "#D5E0FF",
    },
    {
        id: "alioth",
        name: "Alioth",
        rightAscension: 12.9,
        declination: 55.96,
        magnitude: 1.77,
        distance: 81.7,
        spectralClass: "A1III-IVp",
        color: "#D5E0FF",
    },
    {
        id: "mizar",
        name: "Mizar",
        rightAscension: 13.421,
        declination: 54.925,
        magnitude: 2.04,
        distance: 82.9,
        spectralClass: "A2Vp",
        color: "#D5E0FF",
    },
    {
        id: "alkaid",
        name: "Alkaid",
        rightAscension: 13.792,
        declination: 49.313,
        magnitude: 1.86,
        distance: 103.9,
        spectralClass: "B3V",
        color: "#B7C5FF",
    },

    // Orion stars
    {
        id: "betelgeuse",
        name: "Betelgeuse",
        rightAscension: 5.919,
        declination: 7.407,
        magnitude: 0.42,
        distance: 548,
        spectralClass: "M1-2Ia-Iab",
        color: "#FF6B47",
    },
    {
        id: "rigel",
        name: "Rigel",
        rightAscension: 5.242,
        declination: -8.202,
        magnitude: 0.13,
        distance: 863,
        spectralClass: "B8Ia",
        color: "#B7C5FF",
    },
    {
        id: "bellatrix",
        name: "Bellatrix",
        rightAscension: 5.418,
        declination: 6.35,
        magnitude: 1.64,
        distance: 245,
        spectralClass: "B2III",
        color: "#B7C5FF",
    },
    {
        id: "mintaka",
        name: "Mintaka",
        rightAscension: 5.533,
        declination: -0.299,
        magnitude: 2.23,
        distance: 693,
        spectralClass: "O9.5II",
        color: "#AABBFF",
    },
    {
        id: "alnilam",
        name: "Alnilam",
        rightAscension: 5.604,
        declination: -1.202,
        magnitude: 1.69,
        distance: 1340,
        spectralClass: "B0Ia",
        color: "#AABBFF",
    },
    {
        id: "alnitak",
        name: "Alnitak",
        rightAscension: 5.679,
        declination: -1.943,
        magnitude: 1.88,
        distance: 700,
        spectralClass: "O9.7Ib",
        color: "#AABBFF",
    },
    {
        id: "saiph",
        name: "Saiph",
        rightAscension: 5.796,
        declination: -9.67,
        magnitude: 2.09,
        distance: 650,
        spectralClass: "B0.5Ia",
        color: "#AABBFF",
    },

    // Cassiopeia stars
    {
        id: "schedar",
        name: "Schedar",
        rightAscension: 0.675,
        declination: 56.537,
        magnitude: 2.24,
        distance: 228,
        spectralClass: "K0IIIa",
        color: "#FFB366",
    },
    {
        id: "caph",
        name: "Caph",
        rightAscension: 0.153,
        declination: 59.15,
        magnitude: 2.28,
        distance: 54.7,
        spectralClass: "F2III-IV",
        color: "#FFF4E8",
    },
    {
        id: "gamma_cas",
        name: "Gamma Cassiopeiae",
        rightAscension: 0.945,
        declination: 60.717,
        magnitude: 2.47,
        distance: 550,
        spectralClass: "B0.5IVe",
        color: "#B7C5FF",
    },
    {
        id: "ruchbah",
        name: "Ruchbah",
        rightAscension: 1.43,
        declination: 60.235,
        magnitude: 2.68,
        distance: 99.4,
        spectralClass: "A5V",
        color: "#FFF4E8",
    },
    {
        id: "segin",
        name: "Segin",
        rightAscension: 1.901,
        declination: 63.67,
        magnitude: 3.35,
        distance: 442,
        spectralClass: "B3III",
        color: "#B7C5FF",
    },

    // Leo stars
    {
        id: "regulus",
        name: "Regulus",
        rightAscension: 10.139,
        declination: 11.967,
        magnitude: 1.4,
        distance: 79.3,
        spectralClass: "B8IVn",
        color: "#B7C5FF",
    },
    {
        id: "denebola",
        name: "Denebola",
        rightAscension: 11.818,
        declination: 14.572,
        magnitude: 2.14,
        distance: 35.9,
        spectralClass: "A3V",
        color: "#D5E0FF",
    },
    {
        id: "algieba",
        name: "Algieba",
        rightAscension: 10.333,
        declination: 19.842,
        magnitude: 2.28,
        distance: 126,
        spectralClass: "K1III",
        color: "#FFB366",
    },
    {
        id: "zosma",
        name: "Zosma",
        rightAscension: 11.237,
        declination: 20.524,
        magnitude: 2.56,
        distance: 58.4,
        spectralClass: "A4V",
        color: "#FFF4E8",
    },

    // Cygnus stars
    {
        id: "deneb",
        name: "Deneb",
        rightAscension: 20.69,
        declination: 45.28,
        magnitude: 1.25,
        distance: 2615,
        spectralClass: "A2Ia",
        color: "#D5E0FF",
    },
    {
        id: "sadr",
        name: "Sadr",
        rightAscension: 20.371,
        declination: 40.257,
        magnitude: 2.23,
        distance: 1800,
        spectralClass: "F8Ib",
        color: "#FFF4E8",
    },
    {
        id: "gienah",
        name: "Gienah",
        rightAscension: 20.771,
        declination: 33.97,
        magnitude: 2.46,
        distance: 72.1,
        spectralClass: "K3III",
        color: "#FFB366",
    },
    {
        id: "delta_cyg",
        name: "Delta Cygni",
        rightAscension: 19.749,
        declination: 45.131,
        magnitude: 2.87,
        distance: 165,
        spectralClass: "A0IV",
        color: "#D5E0FF",
    },
    {
        id: "albireo",
        name: "Albireo",
        rightAscension: 19.512,
        declination: 27.96,
        magnitude: 3.18,
        distance: 430,
        spectralClass: "K3II",
        color: "#FFB366",
    },
];

export const constellations: Constellation[] = [
    {
        id: "ursa_major",
        name: "Ursa Major",
        abbreviation: "UMa",
        description:
            "The Great Bear, containing the famous Big Dipper asterism",
        mythology:
            "In Greek mythology, this represents Callisto, a nymph who was transformed into a bear by Zeus's jealous wife Hera.",
        stars: stars.filter((star) =>
            [
                "dubhe",
                "merak",
                "phecda",
                "megrez",
                "alioth",
                "mizar",
                "alkaid",
            ].includes(star.id),
        ),
        lines: [
            [0, 1], // Dubhe to Merak
            [1, 2], // Merak to Phecda
            [2, 3], // Phecda to Megrez
            [3, 4], // Megrez to Alioth
            [4, 5], // Alioth to Mizar
            [5, 6], // Mizar to Alkaid
        ],
        visibility: {
            hemisphere: "northern",
            bestMonths: [3, 4, 5, 6, 7],
            minLatitude: -16,
            maxLatitude: 90,
        },
    },
    {
        id: "orion",
        name: "Orion",
        abbreviation: "Ori",
        description: "The Hunter, one of the most recognizable constellations",
        mythology:
            "Orion was a great hunter in Greek mythology. The constellation shows him with his belt, sword, and raised club.",
        stars: stars.filter((star) =>
            [
                "betelgeuse",
                "rigel",
                "bellatrix",
                "mintaka",
                "alnilam",
                "alnitak",
                "saiph",
            ].includes(star.id),
        ),
        lines: [
            [0, 2], // Betelgeuse to Bellatrix
            [2, 3], // Bellatrix to Mintaka
            [3, 4], // Mintaka to Alnilam (Belt)
            [4, 5], // Alnilam to Alnitak (Belt)
            [3, 0], // Mintaka to Betelgeuse
            [5, 1], // Alnitak to Rigel
            [1, 6], // Rigel to Saiph
            [6, 5], // Saiph to Alnitak
        ],
        visibility: {
            hemisphere: "both",
            bestMonths: [11, 12, 1, 2, 3],
            minLatitude: -85,
            maxLatitude: 75,
        },
    },
    {
        id: "cassiopeia",
        name: "Cassiopeia",
        abbreviation: "Cas",
        description: "The Queen, forming a distinctive 'W' shape in the sky",
        mythology:
            "In Greek mythology, Cassiopeia was the vain queen of Ethiopia who boasted that she and her daughter were more beautiful than the sea nymphs.",
        stars: stars.filter((star) =>
            ["schedar", "caph", "gamma_cas", "ruchbah", "segin"].includes(
                star.id,
            ),
        ),
        lines: [
            [1, 0], // Caph to Schedar
            [0, 2], // Schedar to Gamma Cas
            [2, 3], // Gamma Cas to Ruchbah
            [3, 4], // Ruchbah to Segin
        ],
        visibility: {
            hemisphere: "northern",
            bestMonths: [9, 10, 11, 12, 1],
            minLatitude: -20,
            maxLatitude: 90,
        },
    },
    {
        id: "leo",
        name: "Leo",
        abbreviation: "Leo",
        description: "The Lion, representing the Nemean Lion slain by Hercules",
        mythology:
            "This constellation represents the Nemean Lion, a monstrous lion with impenetrable hide that was killed by Hercules as his first labor.",
        stars: stars.filter((star) =>
            ["regulus", "denebola", "algieba", "zosma"].includes(star.id),
        ),
        lines: [
            [0, 2], // Regulus to Algieba
            [2, 3], // Algieba to Zosma
            [3, 1], // Zosma to Denebola
            [1, 0], // Denebola to Regulus
        ],
        visibility: {
            hemisphere: "both",
            bestMonths: [2, 3, 4, 5, 6],
            minLatitude: -65,
            maxLatitude: 90,
        },
    },
    {
        id: "cygnus",
        name: "Cygnus",
        abbreviation: "Cyg",
        description: "The Swan, also known as the Northern Cross",
        mythology:
            "In Greek mythology, this represents Zeus disguised as a swan to seduce Leda, the queen of Sparta.",
        stars: stars.filter((star) =>
            ["deneb", "sadr", "gienah", "delta_cyg", "albireo"].includes(
                star.id,
            ),
        ),
        lines: [
            [0, 1], // Deneb to Sadr
            [1, 4], // Sadr to Albireo
            [3, 1], // Delta Cyg to Sadr
            [1, 2], // Sadr to Gienah
        ],
        visibility: {
            hemisphere: "northern",
            bestMonths: [6, 7, 8, 9, 10],
            minLatitude: -40,
            maxLatitude: 90,
        },
    },
];

export const getStarById = (id: string): Star | undefined => {
    return stars.find((star) => star.id === id);
};

export const getConstellationById = (id: string): Constellation | undefined => {
    return constellations.find((constellation) => constellation.id === id);
};

export const getVisibleConstellations = (
    latitude: number,
    month: number,
): Constellation[] => {
    return constellations.filter((constellation) => {
        const { visibility } = constellation;

        // Check latitude range
        if (
            latitude < visibility.minLatitude ||
            latitude > visibility.maxLatitude
        ) {
            return false;
        }

        // Check hemisphere (approximate)
        if (visibility.hemisphere === "northern" && latitude < -30) {
            return false;
        }
        if (visibility.hemisphere === "southern" && latitude > 30) {
            return false;
        }

        // Check if current month is in best viewing months (with buffer)
        const bestMonths = visibility.bestMonths;
        const extendedMonths = [
            ...bestMonths,
            ...bestMonths.map((m) => (m === 1 ? 12 : m - 1)),
            ...bestMonths.map((m) => (m === 12 ? 1 : m + 1)),
        ];

        return extendedMonths.includes(month);
    });
};
