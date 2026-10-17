import type { Quiz } from "./schema";

const q = (
  topic: string,
  question: string,
  options: [string, string, string, string],
  answerIndex: number,
  explanation: string,
) => ({ topic, q: question, options, answerIndex, explanation });

export const DEMO_QUIZ: Quiz = {
  title: "Solar System Basics (Demo)",
  questions: [
    q("The Sun", "What type of object is the Sun?", ["A planet", "A star", "A comet", "A moon"], 1,
      "The Sun is a G-type main-sequence star at the center of the Solar System."),
    q("Planets", "Which planet is the largest in the Solar System?", ["Saturn", "Neptune", "Jupiter", "Earth"], 2,
      "Jupiter is more than twice as massive as all other planets combined."),
    q("Planets", "Which planet is closest to the Sun?", ["Venus", "Mercury", "Mars", "Earth"], 1,
      "Mercury orbits the Sun at an average distance of about 58 million km."),
    q("Planets", "Which planet is known for its prominent ring system?", ["Mars", "Mercury", "Saturn's neighbor Venus", "Saturn"], 3,
      "Saturn's rings are made mostly of ice particles and are the most extensive in the Solar System."),
    q("Earth and Moon", "Roughly how long does Earth take to orbit the Sun?", ["24 hours", "30 days", "365 days", "10 years"], 2,
      "One orbit takes about 365.25 days, which defines the year."),
    q("Earth and Moon", "What causes the Moon's phases?", ["Earth's shadow covering it", "Its changing position relative to the Sun and Earth", "Clouds in Earth's atmosphere", "The Moon changing size"], 1,
      "We see different portions of the Moon's sunlit half as it orbits Earth."),
    q("Planets", "Which planet is called the Red Planet?", ["Mars", "Jupiter", "Mercury", "Uranus"], 0,
      "Iron oxide on Mars's surface gives it a reddish color."),
    q("Small Bodies", "Where is the main asteroid belt located?", ["Beyond Neptune", "Between Mars and Jupiter", "Between Earth and Venus", "Around Saturn"], 1,
      "Most asteroids orbit in a belt between the orbits of Mars and Jupiter."),
    q("The Sun", "What process powers the Sun?", ["Nuclear fusion", "Chemical burning", "Nuclear fission", "Friction"], 0,
      "In its core the Sun fuses hydrogen into helium, releasing energy."),
    q("Planets", "Which planet has the hottest surface temperature?", ["Mercury", "Mars", "Venus", "Jupiter"], 2,
      "Venus's thick CO2 atmosphere traps heat, making it hotter than even Mercury."),
  ],
  swot: {
    strengths: [
      "Well-understood orbital mechanics allow precise predictions.",
      "Abundant data from decades of space missions.",
      "Diverse planetary types give rich comparative science.",
    ],
    weaknesses: [
      "Outer planets remain poorly explored in detail.",
      "Distances make crewed exploration extremely costly.",
      "Many moons and small bodies are still uncharacterized.",
    ],
    opportunities: [
      "Mars and lunar missions can expand human presence.",
      "Asteroid resources could support future space industry.",
      "Icy moons offer targets in the search for life.",
    ],
    threats: [
      "Near-Earth objects pose impact risk.",
      "Space debris endangers satellites and missions.",
      "Funding and political shifts can cancel missions.",
    ],
  },
};
