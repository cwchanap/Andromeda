import type { Constellation, Star } from "../types/constellation";

// Comprehensive star catalog for 360-degree sky viewing
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

    // Additional bright stars for comprehensive sky coverage
    // Southern Cross (Crux)
    {
        id: "acrux",
        name: "Acrux",
        rightAscension: 12.443,
        declination: -63.099,
        magnitude: 0.77,
        distance: 321,
        spectralClass: "B0.5IV",
        color: "#B7C5FF",
    },
    {
        id: "gacrux",
        name: "Gacrux",
        rightAscension: 12.519,
        declination: -57.113,
        magnitude: 1.63,
        distance: 88,
        spectralClass: "M3.5III",
        color: "#FF6B47",
    },

    // Centaurus
    {
        id: "alpha_cen",
        name: "Alpha Centauri",
        rightAscension: 14.66,
        declination: -60.834,
        magnitude: -0.27,
        distance: 4.37,
        spectralClass: "G2V",
        color: "#FFF4E8",
    },
    {
        id: "beta_cen",
        name: "Hadar",
        rightAscension: 14.064,
        declination: -60.373,
        magnitude: 0.61,
        distance: 390,
        spectralClass: "B1III",
        color: "#B7C5FF",
    },

    // Scorpius
    {
        id: "antares",
        name: "Antares",
        rightAscension: 16.49,
        declination: -26.432,
        magnitude: 0.96,
        distance: 550,
        spectralClass: "M1.5Iab",
        color: "#FF6B47",
    },
    {
        id: "shaula",
        name: "Shaula",
        rightAscension: 17.561,
        declination: -37.104,
        magnitude: 1.63,
        distance: 570,
        spectralClass: "B1.5IV",
        color: "#B7C5FF",
    },

    // Sagittarius
    {
        id: "nunki",
        name: "Nunki",
        rightAscension: 18.921,
        declination: -26.297,
        magnitude: 2.05,
        distance: 228,
        spectralClass: "B2.5V",
        color: "#B7C5FF",
    },
    {
        id: "kaus_australis",
        name: "Kaus Australis",
        rightAscension: 18.403,
        declination: -34.385,
        magnitude: 1.85,
        distance: 145,
        spectralClass: "B9.5III",
        color: "#D5E0FF",
    },

    // Aquila
    {
        id: "altair",
        name: "Altair",
        rightAscension: 19.846,
        declination: 8.868,
        magnitude: 0.77,
        distance: 16.7,
        spectralClass: "A7V",
        color: "#FFF4E8",
    },

    // Lyra
    {
        id: "vega",
        name: "Vega",
        rightAscension: 18.615,
        declination: 38.784,
        magnitude: 0.03,
        distance: 25,
        spectralClass: "A0V",
        color: "#D5E0FF",
    },

    // Boötes
    {
        id: "arcturus",
        name: "Arcturus",
        rightAscension: 14.261,
        declination: 19.182,
        magnitude: -0.05,
        distance: 36.7,
        spectralClass: "K1.5IIIFe-0.5",
        color: "#FFB366",
    },

    // Virgo
    {
        id: "spica",
        name: "Spica",
        rightAscension: 13.42,
        declination: -11.161,
        magnitude: 0.97,
        distance: 250,
        spectralClass: "B1III-IV",
        color: "#B7C5FF",
    },

    // Gemini
    {
        id: "castor",
        name: "Castor",
        rightAscension: 7.577,
        declination: 31.888,
        magnitude: 1.58,
        distance: 51,
        spectralClass: "A1V",
        color: "#D5E0FF",
    },
    {
        id: "pollux",
        name: "Pollux",
        rightAscension: 7.755,
        declination: 28.026,
        magnitude: 1.14,
        distance: 33.8,
        spectralClass: "K0III",
        color: "#FFB366",
    },

    // Auriga
    {
        id: "capella",
        name: "Capella",
        rightAscension: 5.278,
        declination: 45.998,
        magnitude: 0.08,
        distance: 42.9,
        spectralClass: "G5III",
        color: "#FFF4E8",
    },

    // Taurus
    {
        id: "aldebaran",
        name: "Aldebaran",
        rightAscension: 4.599,
        declination: 16.509,
        magnitude: 0.85,
        distance: 65.3,
        spectralClass: "K5III",
        color: "#FFB366",
    },

    // Perseus
    {
        id: "mirfak",
        name: "Mirfak",
        rightAscension: 3.405,
        declination: 49.861,
        magnitude: 1.79,
        distance: 590,
        spectralClass: "F5Ib",
        color: "#FFF4E8",
    },

    // Andromeda
    {
        id: "alpheratz",
        name: "Alpheratz",
        rightAscension: 0.139,
        declination: 29.091,
        magnitude: 2.06,
        distance: 97,
        spectralClass: "A0p",
        color: "#D5E0FF",
    },

    // Pegasus
    {
        id: "markab",
        name: "Markab",
        rightAscension: 23.079,
        declination: 15.205,
        magnitude: 2.49,
        distance: 140,
        spectralClass: "A0III",
        color: "#D5E0FF",
    },
    {
        id: "scheat",
        name: "Scheat",
        rightAscension: 23.063,
        declination: 28.083,
        magnitude: 2.42,
        distance: 196,
        spectralClass: "M2.5II-III",
        color: "#FF6B47",
    },

    // Aquarius
    {
        id: "sadalsuud",
        name: "Sadalsuud",
        rightAscension: 21.526,
        declination: -5.571,
        magnitude: 2.87,
        distance: 540,
        spectralClass: "G0Ib",
        color: "#FFF4E8",
    },

    // Capricornus
    {
        id: "deneb_algedi",
        name: "Deneb Algedi",
        rightAscension: 21.784,
        declination: -16.127,
        magnitude: 2.81,
        distance: 38.5,
        spectralClass: "A5III",
        color: "#FFF4E8",
    },

    // Pisces Austrinus
    {
        id: "fomalhaut",
        name: "Fomalhaut",
        rightAscension: 22.96,
        declination: -29.622,
        magnitude: 1.16,
        distance: 25.1,
        spectralClass: "A3V",
        color: "#FFF4E8",
    },

    // Aries
    {
        id: "hamal",
        name: "Hamal",
        rightAscension: 2.119,
        declination: 23.463,
        magnitude: 2.0,
        distance: 65.8,
        spectralClass: "K2III",
        color: "#FFB366",
    },

    // Additional Northern Stars
    {
        id: "polaris",
        name: "Polaris",
        rightAscension: 2.53,
        declination: 89.264,
        magnitude: 1.98,
        distance: 433,
        spectralClass: "F7Ib",
        color: "#FFF4E8",
    },

    // Corona Borealis
    {
        id: "alphecca",
        name: "Alphecca",
        rightAscension: 15.578,
        declination: 26.715,
        magnitude: 2.23,
        distance: 75,
        spectralClass: "A0V",
        color: "#D5E0FF",
    },

    // Draco
    {
        id: "thuban",
        name: "Thuban",
        rightAscension: 14.073,
        declination: 64.376,
        magnitude: 3.65,
        distance: 303,
        spectralClass: "A0III",
        color: "#D5E0FF",
    },
    {
        id: "etamin",
        name: "Etamin",
        rightAscension: 17.943,
        declination: 51.489,
        magnitude: 2.23,
        distance: 154,
        spectralClass: "K5III",
        color: "#FFB366",
    },

    // Hercules
    {
        id: "kornephoros",
        name: "Kornephoros",
        rightAscension: 16.503,
        declination: 21.49,
        magnitude: 2.77,
        distance: 139,
        spectralClass: "G7III",
        color: "#FFF4E8",
    },

    // Ophiuchus
    {
        id: "rasalhague",
        name: "Rasalhague",
        rightAscension: 17.582,
        declination: 12.56,
        magnitude: 2.08,
        distance: 48.6,
        spectralClass: "A5III",
        color: "#FFF4E8",
    },

    // Serpens
    {
        id: "unukalhai",
        name: "Unukalhai",
        rightAscension: 15.738,
        declination: 6.426,
        magnitude: 2.63,
        distance: 73,
        spectralClass: "K2III",
        color: "#FFB366",
    },

    // Libra
    {
        id: "zubeneschamali",
        name: "Zubeneschamali",
        rightAscension: 15.283,
        declination: -9.383,
        magnitude: 2.61,
        distance: 185,
        spectralClass: "B8V",
        color: "#B7C5FF",
    },

    // Additional Southern Hemisphere Stars
    // Canis Major
    {
        id: "sirius",
        name: "Sirius",
        rightAscension: 6.752,
        declination: -16.716,
        magnitude: -1.46,
        distance: 8.6,
        spectralClass: "A1V",
        color: "#D5E0FF",
    },
    {
        id: "adhara",
        name: "Adhara",
        rightAscension: 6.977,
        declination: -28.972,
        magnitude: 1.5,
        distance: 430,
        spectralClass: "B2II",
        color: "#B7C5FF",
    },

    // Canis Minor
    {
        id: "procyon",
        name: "Procyon",
        rightAscension: 7.655,
        declination: 5.225,
        magnitude: 0.38,
        distance: 11.5,
        spectralClass: "F5IV-V",
        color: "#FFF4E8",
    },

    // Hydra
    {
        id: "alphard",
        name: "Alphard",
        rightAscension: 9.46,
        declination: -8.658,
        magnitude: 1.98,
        distance: 177,
        spectralClass: "K3II-III",
        color: "#FFB366",
    },

    // Corvus
    {
        id: "gienah_corvi",
        name: "Gienah",
        rightAscension: 12.263,
        declination: -17.542,
        magnitude: 2.59,
        distance: 165,
        spectralClass: "B8III",
        color: "#B7C5FF",
    },

    // Crater
    {
        id: "alkes",
        name: "Alkes",
        rightAscension: 10.996,
        declination: -18.299,
        magnitude: 4.08,
        distance: 174,
        spectralClass: "K1III",
        color: "#FFB366",
    },

    // Eridanus
    {
        id: "achernar",
        name: "Achernar",
        rightAscension: 1.629,
        declination: -57.237,
        magnitude: 0.46,
        distance: 139,
        spectralClass: "B6Vep",
        color: "#B7C5FF",
    },

    // Piscis Austrinus (additional)
    {
        id: "epsilon_psa",
        name: "Epsilon PsA",
        rightAscension: 22.676,
        declination: -27.044,
        magnitude: 4.17,
        distance: 744,
        spectralClass: "B8V",
        color: "#B7C5FF",
    },

    // Add many more fainter stars for a rich starfield
    // These create a background star field for immersion
    {
        id: "star_001",
        name: "HD 1234",
        rightAscension: 0.5,
        declination: 45.0,
        magnitude: 4.5,
        distance: 100,
        spectralClass: "G5V",
        color: "#FFF4E8",
    },
    {
        id: "star_002",
        name: "HD 2345",
        rightAscension: 1.0,
        declination: -30.0,
        magnitude: 4.8,
        distance: 120,
        spectralClass: "K0V",
        color: "#FFB366",
    },
    {
        id: "star_003",
        name: "HD 3456",
        rightAscension: 2.5,
        declination: 60.0,
        magnitude: 4.2,
        distance: 80,
        spectralClass: "A0V",
        color: "#D5E0FF",
    },
    {
        id: "star_004",
        name: "HD 4567",
        rightAscension: 3.8,
        declination: -15.0,
        magnitude: 4.9,
        distance: 200,
        spectralClass: "M0V",
        color: "#FF6B47",
    },
    {
        id: "star_005",
        name: "HD 5678",
        rightAscension: 5.2,
        declination: 25.0,
        magnitude: 4.3,
        distance: 90,
        spectralClass: "F0V",
        color: "#FFF4E8",
    },
    {
        id: "star_006",
        name: "HD 6789",
        rightAscension: 7.1,
        declination: -45.0,
        magnitude: 4.7,
        distance: 150,
        spectralClass: "B5V",
        color: "#B7C5FF",
    },
    {
        id: "star_007",
        name: "HD 7890",
        rightAscension: 8.5,
        declination: 35.0,
        magnitude: 4.1,
        distance: 70,
        spectralClass: "G0V",
        color: "#FFF4E8",
    },
    {
        id: "star_008",
        name: "HD 8901",
        rightAscension: 9.8,
        declination: -55.0,
        magnitude: 4.6,
        distance: 180,
        spectralClass: "K5V",
        color: "#FFB366",
    },
    {
        id: "star_009",
        name: "HD 9012",
        rightAscension: 11.3,
        declination: 15.0,
        magnitude: 4.4,
        distance: 110,
        spectralClass: "A5V",
        color: "#D5E0FF",
    },
    {
        id: "star_010",
        name: "HD 0123",
        rightAscension: 13.7,
        declination: -25.0,
        magnitude: 4.8,
        distance: 220,
        spectralClass: "M2V",
        color: "#FF6B47",
    },
    {
        id: "star_011",
        name: "HD 1124",
        rightAscension: 15.1,
        declination: 55.0,
        magnitude: 4.2,
        distance: 85,
        spectralClass: "F5V",
        color: "#FFF4E8",
    },
    {
        id: "star_012",
        name: "HD 2235",
        rightAscension: 16.9,
        declination: -35.0,
        magnitude: 4.9,
        distance: 190,
        spectralClass: "B8V",
        color: "#B7C5FF",
    },
    {
        id: "star_013",
        name: "HD 3346",
        rightAscension: 18.2,
        declination: 5.0,
        magnitude: 4.3,
        distance: 95,
        spectralClass: "G8V",
        color: "#FFF4E8",
    },
    {
        id: "star_014",
        name: "HD 4457",
        rightAscension: 20.6,
        declination: -50.0,
        magnitude: 4.7,
        distance: 160,
        spectralClass: "K2V",
        color: "#FFB366",
    },
    {
        id: "star_015",
        name: "HD 5568",
        rightAscension: 22.1,
        declination: 40.0,
        magnitude: 4.1,
        distance: 75,
        spectralClass: "A2V",
        color: "#D5E0FF",
    },
    {
        id: "star_016",
        name: "HD 6679",
        rightAscension: 23.8,
        declination: -10.0,
        magnitude: 4.6,
        distance: 140,
        spectralClass: "F8V",
        color: "#FFF4E8",
    },
    // Continue adding more background stars in different sky regions...
    {
        id: "star_017",
        name: "HD 7780",
        rightAscension: 4.2,
        declination: 70.0,
        magnitude: 4.5,
        distance: 125,
        spectralClass: "G2V",
        color: "#FFF4E8",
    },
    {
        id: "star_018",
        name: "HD 8891",
        rightAscension: 6.7,
        declination: -60.0,
        magnitude: 4.8,
        distance: 210,
        spectralClass: "M1V",
        color: "#FF6B47",
    },
    {
        id: "star_019",
        name: "HD 9902",
        rightAscension: 10.4,
        declination: 80.0,
        magnitude: 4.4,
        distance: 105,
        spectralClass: "A8V",
        color: "#D5E0FF",
    },
    {
        id: "star_020",
        name: "HD 0013",
        rightAscension: 14.8,
        declination: -70.0,
        magnitude: 4.7,
        distance: 175,
        spectralClass: "K8V",
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

    // Additional constellations for comprehensive sky coverage
    {
        id: "crux",
        name: "Crux",
        abbreviation: "Cru",
        description: "The Southern Cross, smallest constellation in the sky",
        mythology:
            "A modern constellation, the Southern Cross was known to ancient civilizations but became a distinct constellation in the 16th century.",
        stars: stars.filter((star) => ["acrux", "gacrux"].includes(star.id)),
        lines: [
            [0, 1], // Acrux to Gacrux
        ],
        visibility: {
            hemisphere: "southern",
            bestMonths: [3, 4, 5, 6, 7],
            minLatitude: -90,
            maxLatitude: 25,
        },
    },
    {
        id: "centaurus",
        name: "Centaurus",
        abbreviation: "Cen",
        description: "The Centaur, home to our nearest stellar neighbor",
        mythology:
            "Represents Chiron, the wise centaur who taught heroes like Achilles and Jason.",
        stars: stars.filter((star) =>
            ["alpha_cen", "beta_cen"].includes(star.id),
        ),
        lines: [
            [0, 1], // Alpha Cen to Beta Cen
        ],
        visibility: {
            hemisphere: "southern",
            bestMonths: [4, 5, 6, 7, 8],
            minLatitude: -90,
            maxLatitude: 25,
        },
    },
    {
        id: "scorpius",
        name: "Scorpius",
        abbreviation: "Sco",
        description: "The Scorpion, featuring the red supergiant Antares",
        mythology:
            "The scorpion that killed Orion in Greek mythology. They are placed on opposite sides of the sky.",
        stars: stars.filter((star) => ["antares", "shaula"].includes(star.id)),
        lines: [
            [0, 1], // Antares to Shaula
        ],
        visibility: {
            hemisphere: "both",
            bestMonths: [5, 6, 7, 8, 9],
            minLatitude: -90,
            maxLatitude: 40,
        },
    },
    {
        id: "sagittarius",
        name: "Sagittarius",
        abbreviation: "Sgr",
        description: "The Archer, pointing toward the galactic center",
        mythology:
            "Represents a centaur archer, often identified with Chiron or Crotus in Greek mythology.",
        stars: stars.filter((star) =>
            ["nunki", "kaus_australis"].includes(star.id),
        ),
        lines: [
            [0, 1], // Nunki to Kaus Australis
        ],
        visibility: {
            hemisphere: "both",
            bestMonths: [6, 7, 8, 9, 10],
            minLatitude: -90,
            maxLatitude: 45,
        },
    },
    {
        id: "aquila",
        name: "Aquila",
        abbreviation: "Aql",
        description: "The Eagle, featuring the bright star Altair",
        mythology:
            "Zeus's eagle that carried his thunderbolts and abducted Ganymede to serve as cupbearer to the gods.",
        stars: stars.filter((star) => ["altair"].includes(star.id)),
        lines: [],
        visibility: {
            hemisphere: "both",
            bestMonths: [6, 7, 8, 9, 10],
            minLatitude: -75,
            maxLatitude: 85,
        },
    },
    {
        id: "lyra",
        name: "Lyra",
        abbreviation: "Lyr",
        description: "The Harp, featuring the brilliant star Vega",
        mythology:
            "The lyre of Orpheus, whose music could charm all living things and even move stones.",
        stars: stars.filter((star) => ["vega"].includes(star.id)),
        lines: [],
        visibility: {
            hemisphere: "northern",
            bestMonths: [6, 7, 8, 9, 10],
            minLatitude: -40,
            maxLatitude: 90,
        },
    },
    {
        id: "bootes",
        name: "Boötes",
        abbreviation: "Boo",
        description: "The Herdsman, featuring the bright star Arcturus",
        mythology:
            "The ploughman or herdsman who invented the plough drawn by oxen, for which he was rewarded with a place in the sky.",
        stars: stars.filter((star) => ["arcturus"].includes(star.id)),
        lines: [],
        visibility: {
            hemisphere: "northern",
            bestMonths: [4, 5, 6, 7, 8],
            minLatitude: -35,
            maxLatitude: 90,
        },
    },
    {
        id: "virgo",
        name: "Virgo",
        abbreviation: "Vir",
        description: "The Virgin, featuring the bright star Spica",
        mythology:
            "Often associated with Persephone, daughter of Demeter, or Astraea, the goddess of justice.",
        stars: stars.filter((star) => ["spica"].includes(star.id)),
        lines: [],
        visibility: {
            hemisphere: "both",
            bestMonths: [3, 4, 5, 6, 7],
            minLatitude: -80,
            maxLatitude: 80,
        },
    },
    {
        id: "gemini",
        name: "Gemini",
        abbreviation: "Gem",
        description: "The Twins, featuring Castor and Pollux",
        mythology:
            "The twin brothers Castor and Pollux, known as the Dioscuri, protectors of sailors.",
        stars: stars.filter((star) => ["castor", "pollux"].includes(star.id)),
        lines: [
            [0, 1], // Castor to Pollux
        ],
        visibility: {
            hemisphere: "both",
            bestMonths: [12, 1, 2, 3, 4],
            minLatitude: -60,
            maxLatitude: 90,
        },
    },
    {
        id: "auriga",
        name: "Auriga",
        abbreviation: "Aur",
        description: "The Charioteer, featuring the bright star Capella",
        mythology:
            "Represents Erichthonius of Athens, who invented the four-horse chariot.",
        stars: stars.filter((star) => ["capella"].includes(star.id)),
        lines: [],
        visibility: {
            hemisphere: "northern",
            bestMonths: [11, 12, 1, 2, 3],
            minLatitude: -35,
            maxLatitude: 90,
        },
    },
    {
        id: "taurus",
        name: "Taurus",
        abbreviation: "Tau",
        description: "The Bull, featuring the bright star Aldebaran",
        mythology:
            "Zeus disguised as a bull to abduct Europa, or the bull that carried Europa across the sea to Crete.",
        stars: stars.filter((star) => ["aldebaran"].includes(star.id)),
        lines: [],
        visibility: {
            hemisphere: "both",
            bestMonths: [11, 12, 1, 2, 3],
            minLatitude: -65,
            maxLatitude: 85,
        },
    },
    {
        id: "canis_major",
        name: "Canis Major",
        abbreviation: "CMa",
        description: "The Great Dog, featuring Sirius, the brightest star",
        mythology:
            "One of Orion's hunting dogs, following the hunter across the sky.",
        stars: stars.filter((star) => ["sirius", "adhara"].includes(star.id)),
        lines: [
            [0, 1], // Sirius to Adhara
        ],
        visibility: {
            hemisphere: "both",
            bestMonths: [12, 1, 2, 3, 4],
            minLatitude: -90,
            maxLatitude: 60,
        },
    },
    {
        id: "canis_minor",
        name: "Canis Minor",
        abbreviation: "CMi",
        description: "The Little Dog, featuring Procyon",
        mythology:
            "Orion's smaller hunting dog, also following the hunter across the sky.",
        stars: stars.filter((star) => ["procyon"].includes(star.id)),
        lines: [],
        visibility: {
            hemisphere: "both",
            bestMonths: [1, 2, 3, 4, 5],
            minLatitude: -75,
            maxLatitude: 85,
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
