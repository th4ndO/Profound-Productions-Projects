/**
 * Step-by-step plans for common goals: milestones with small tasks, plus
 * tips, where to find help, and safety notes. A plan belongs to an idea in
 * ideas.ts (same id). Adopting that idea copies the milestones and tasks
 * into the user's goal, and the goal page shows the tips and resources.
 *
 * Resources are named with how to find them, not linked: they were written
 * without being able to open and check the pages, and a named, well-known
 * resource can't be a dead or made-up link. Add URLs only once checked.
 */

export interface PlanMilestone {
  title: string;
  tasks: string[];
}

export interface PlanResource {
  name: string;
  detail: string;
}

export interface Plan {
  /** Matched against a goal title the user types (lower-cased). */
  match: RegExp[];
  milestones: PlanMilestone[];
  tips: string[];
  resources: PlanResource[];
  caution?: string;
}

const RUN_TIPS = [
  "Run slowly enough to talk in full sentences (the \"talk test\"). Most beginners go too fast.",
  "If a week felt too hard, repeat it. That's normal, and it still counts as progress.",
  "Keep a rest day between runs: your body gets stronger while you rest.",
  "Warm up with 5 minutes of brisk walking, and cool down the same way.",
  "Missed a run? Carry on from where you are; don't double up to catch up.",
  "Proper running shoes matter more than any gadget.",
];

const RUN_RESOURCES: PlanResource[] = [
  {
    name: "NHS Couch to 5K",
    detail: "Free app with a coach talking you through each run. Search \"NHS Couch to 5K\" in your app store.",
  },
  {
    name: "parkrun",
    detail: "A free, timed 5 km every Saturday morning in parks across South Africa. Register once at parkrun.co.za.",
  },
  {
    name: "A local running club",
    detail: "Most towns have one, often with a beginners' group. Running with others keeps you going.",
  },
];

const RUN_CAUTION =
  "Check with a doctor first if you have a heart or breathing condition, are pregnant, or haven't been active for a long time. Stop if you feel chest pain, faintness or unusual breathlessness.";

const RUN_WALK_WEEKS: PlanMilestone = {
  title: "Weeks 1–3: run/walk 3 times a week",
  tasks: [
    "Pick 3 run days with a rest day between each",
    "Week 1: walk 5 min, then 8 × (run 1 min, walk 1½ min)",
    "Week 2: walk 5 min, then 6 × (run 1½ min, walk 2 min)",
    "Week 3: walk 5 min, then 4 × (run 3 min, walk 2 min)",
  ],
};

const TWENTY_MINUTES: PlanMilestone = {
  title: "Weeks 4–6: run 20 minutes non-stop",
  tasks: [
    "Week 4: 3 × (run 5 min, walk 2½ min)",
    "Week 5: run 8 min, walk 5 min, run 8 min",
    "Week 6: run 20 minutes without stopping",
  ],
};

export const PLANS: Record<string, Plan> = {
  "run-10k": {
    match: [/\b10\s?kms?\b/, /\bten\s?(kms?\b|k\b|kilomet)/, /\b10\s?000\s?m\b/, /\b(run|jog|race|running)\b.*\b10\s?k\b/, /\b10\s?k\b.*\b(run|jog|race)/],
    milestones: [
      RUN_WALK_WEEKS,
      TWENTY_MINUTES,
      {
        title: "Weeks 7–8: run 30 minutes non-stop (about 5 km)",
        tasks: ["Week 7: three 25-minute runs", "Week 8: three 30-minute runs", "Run a parkrun 5 km without walking"],
      },
      {
        title: "Weeks 9–10: build your long run to 7 km",
        tasks: ["Two easy 30-minute runs each week", "Long run: 6 km in week 9, 7 km in week 10"],
      },
      {
        title: "Weeks 11–12: build your long run to 8.5 km",
        tasks: ["Two easy 30–35 minute runs each week", "Long run: 8 km in week 11, 8.5 km in week 12"],
      },
      {
        title: "Week 13: run 10 km without stopping",
        tasks: [
          "If 8.5 km felt hard, repeat week 12 first",
          "One easy 30-minute run early in the week",
          "Rest the day before",
          "Run 10 km slowly and steadily, without stopping",
        ],
      },
    ],
    tips: RUN_TIPS,
    resources: RUN_RESOURCES,
    caution: RUN_CAUTION,
  },

  parkrun: {
    match: [/parkrun/, /\b5\s?kms?\b/, /\bfive\s?(kms?\b|k\b|kilomet)/, /couch to 5/, /\b(run|jog|race|running)\b.*\b5\s?k\b/, /\b5\s?k\b.*\b(run|jog|race)/],
    milestones: [
      {
        title: "Register for parkrun and do your first one (walking is fine)",
        tasks: [
          "Register once and save your barcode on your phone",
          "Find your nearest parkrun",
          "Walk or jog your first parkrun",
        ],
      },
      RUN_WALK_WEEKS,
      TWENTY_MINUTES,
      {
        title: "Weeks 7–9: run 30 minutes non-stop",
        tasks: ["Week 7: three 25-minute runs", "Week 8: three 28-minute runs", "Week 9: three 30-minute runs"],
      },
      {
        title: "Run the full parkrun without walking",
        tasks: [
          "Rest the day before",
          "Start slowly near the back and run your own pace",
          "Look up your time online afterwards",
        ],
      },
    ],
    tips: RUN_TIPS,
    resources: RUN_RESOURCES,
    caution: RUN_CAUTION,
  },

  half: {
    match: [/half\s?-?marathon/, /\b21(\.1)?\s?(km|k)\b/],
    milestones: [
      {
        title: "Run 5 km without stopping",
        tasks: ["Follow a Couch to 5K plan, 3 runs a week", "Run a parkrun without walking"],
      },
      {
        title: "Run 10 km without stopping",
        tasks: ["Add about 1 km to one run each week", "Keep your other two runs short and easy"],
      },
      {
        title: "Enter a half marathon 12 to 16 weeks away",
        tasks: ["Pick a flat, well-supported race for your first one", "Put race day in your calendar"],
      },
      {
        title: "Build your long run to 16 km",
        tasks: [
          "Add 1 to 2 km to your weekly long run",
          "Every 3rd or 4th week, run a shorter long run to recover",
          "Practise drinking and a snack on runs over an hour",
        ],
      },
      {
        title: "Taper, then finish the half marathon",
        tasks: [
          "Run about a third less in the last 2 weeks",
          "Lay out your kit the night before",
          "Start slower than you think and finish strong",
        ],
      },
    ],
    tips: [
      ...RUN_TIPS.slice(0, 3),
      "Most of your running should be slow. Speed comes from consistency, not from racing every run.",
      "Two short strength sessions a week (squats, lunges, planks) help prevent injuries.",
      "Nothing new on race day: same shoes, same breakfast, same drinks as in training.",
    ],
    resources: [
      RUN_RESOURCES[1],
      RUN_RESOURCES[2],
      {
        name: "Race calendars",
        detail: "Search \"half marathon calendar South Africa\" to find races near you.",
      },
    ],
    caution: RUN_CAUTION,
  },

  pullups: {
    match: [/pull[\s-]?ups?/, /chin[\s-]?ups?/],
    milestones: [
      {
        title: "Hang from the bar for 30 seconds",
        tasks: ["3 hangs, as long as you can, 3 days a week", "Add about 5 seconds each session"],
      },
      {
        title: "Slow negatives: 3 sets of 3",
        tasks: [
          "Step up so your chin is over the bar, then lower over 3 to 5 seconds",
          "3 sets of 3, 3 days a week, with a rest day between",
        ],
      },
      {
        title: "Your first strict pull-up",
        tasks: [
          "Add shoulder shrugs on the bar: hang, then pull your shoulders down",
          "Try one full pull-up at the start of each session, while you're fresh",
        ],
      },
      {
        title: "3 pull-ups in a row",
        tasks: ["Do 5 single pull-ups with a rest between each", "Finish each session with 2 sets of negatives"],
      },
      {
        title: "5 pull-ups in a row",
        tasks: ["Ladders: 1, 2, 3 with a rest between, repeated twice", "Test your maximum once a week"],
      },
    ],
    tips: [
      "Full range every time: start from straight arms, finish with your chin over the bar.",
      "Rows and push-ups build the same muscles and help you get there faster.",
      "Don't train pull-ups every day: muscles grow on rest days.",
    ],
    resources: [
      {
        name: "A pull-up bar",
        detail: "A doorway bar at home, or the bars at an outdoor gym in a park.",
      },
      {
        name: "Resistance bands (optional)",
        detail: "Loop one over the bar and under your knee to take some weight off while you learn.",
      },
    ],
    caution: "Stop if you feel sharp pain in your shoulders, elbows or wrists.",
  },

  fund: {
    match: [/emergency\s?fund/, /rainy\s?day/, /(save|saving|savings).*(emergency|buffer)/],
    milestones: [
      {
        title: "Work out one month of essential costs",
        tasks: ["List rent, food, transport, airtime and debt payments", "Add them up: that's your target"],
      },
      {
        title: "Open a separate savings pocket",
        tasks: ["Keep it apart from your everyday account", "Name it \"Emergency fund\""],
      },
      {
        title: "Automate a monthly saving",
        tasks: ["Set up a debit order for payday", "Start with any amount you can keep up"],
      },
      {
        title: "Half your target saved",
        tasks: [
          "Add windfalls: bonuses, refunds, gifts",
          "Cut one expense for 3 months and save the difference",
        ],
      },
      {
        title: "Your full target saved",
        tasks: ["Only use it for real emergencies", "If you use it, top it back up first"],
      },
    ],
    tips: [
      "Pay yourself first: save on payday, not with what's left at month end.",
      "Easy to reach, but not in the account you spend from.",
      "A real emergency is a job loss, medical bill or urgent repair. Not a sale.",
    ],
    resources: [
      {
        name: "Your bank's app",
        detail: "Most South African banks let you open a free savings pocket in their app in a few minutes.",
      },
      {
        name: "Just One Lap",
        detail: "Free South African personal finance guides and podcasts. Search \"Just One Lap\".",
      },
    ],
  },

  typing: {
    match: [/touch\s?-?typ/, /\btyping\b/, /\bwpm\b/, /type faster/],
    milestones: [
      {
        title: "Home row without looking",
        tasks: [
          "Learn the resting position: left hand on ASDF, right hand on JKL;",
          "10 minutes a day of home-row drills",
          "Cover your hands with a cloth if you keep peeking",
        ],
      },
      {
        title: "30 wpm",
        tasks: ["15 minutes of practice a day", "Aim for 95% accuracy before speed"],
      },
      {
        title: "45 wpm",
        tasks: ["Practise your slowest letters and common words", "Take one timed test a week"],
      },
      {
        title: "60 wpm at 95% accuracy",
        tasks: ["Type all your everyday messages properly", "Three timed tests over 60 wpm"],
      },
    ],
    tips: [
      "Accuracy first. Speed follows; mistakes you practise become habits.",
      "15 minutes a day beats an hour once a week.",
      "Sit up, wrists level, eyes on the screen.",
    ],
    resources: [
      { name: "keybr", detail: "Free typing lessons that focus on your weakest letters. Search \"keybr\"." },
      { name: "Monkeytype", detail: "Free typing tests to track your speed. Search \"Monkeytype\"." },
      { name: "Typing.com", detail: "Free step-by-step typing lessons for beginners." },
    ],
  },

  "sleep-7": {
    match: [/\bsleep/, /bed\s?time/, /insomnia/],
    milestones: [
      {
        title: "Pick one wake-up time for all 7 days, weekends too",
        tasks: ["Set the same alarm for every day", "Get some daylight within an hour of waking"],
      },
      {
        title: "Set a bedtime 8 hours before it",
        tasks: ["Set a wind-down reminder 30 minutes before bedtime", "No caffeine after about 2 pm"],
      },
      {
        title: "Screens off 30 minutes before bed",
        tasks: ["Charge your phone outside the bedroom", "Read, stretch or pray instead"],
      },
      {
        title: "10 nights on schedule",
        tasks: ["Keep the bedroom dark, quiet and cool", "Can't sleep after 20 minutes? Get up and read until sleepy"],
      },
      {
        title: "25 of 30 nights on schedule",
        tasks: ["Notice how you feel in the mornings", "Keep the same wake-up time after late nights"],
      },
    ],
    tips: [
      "The wake-up time matters most: keep it fixed and bedtime follows.",
      "Alcohol and late heavy meals make sleep lighter, even if they make you drowsy.",
      "A short nap (under 20 minutes, before 3 pm) is fine; long late naps aren't.",
    ],
    resources: [
      {
        name: "NHS Every Mind Matters",
        detail: "Free, practical sleep tips. Search \"Every Mind Matters sleep\".",
      },
      {
        name: "Sleep Foundation",
        detail: "Free, detailed guides on healthy sleep habits. Search \"Sleep Foundation sleep hygiene\".",
      },
    ],
    caution:
      "See a doctor if you snore loudly, stop breathing in your sleep, or still feel exhausted after sleeping well.",
  },

  "bible-in-a-year": {
    match: [/\bbible\b/, /\bscripture/],
    milestones: [
      {
        title: "Choose a one-year reading plan",
        tasks: [
          "Pick a plan that reads straight through, so these milestones line up",
          "Set a daily time and place, about 15 to 20 minutes",
        ],
      },
      {
        title: "Finish the Law (Genesis to Deuteronomy)",
        tasks: ["About 3 to 4 chapters a day", "Watch the overview video for each book before you start it"],
      },
      {
        title: "Finish the Old Testament",
        tasks: ["Write down one verse a day that stood out", "Pray about what you read"],
      },
      {
        title: "Finish the Gospels and Acts",
        tasks: ["Read one Gospel with a friend and talk about it", "Keep going on busy days, even a few verses"],
      },
      {
        title: "Finish Revelation",
        tasks: ["Look back over your verses from the year", "Thank God and choose next year's plan"],
      },
    ],
    tips: [
      "Missed days? Don't try to catch up; just continue from today's reading.",
      "An audio Bible on the commute counts.",
      "Reading with a friend or small group makes it far easier to keep going.",
    ],
    resources: [
      {
        name: "YouVersion Bible App",
        detail: "Free, with one-year reading plans, reminders and audio. Search \"Bible App\" by YouVersion.",
      },
      {
        name: "BibleProject",
        detail: "Free short videos giving an overview of every book of the Bible. Search \"BibleProject\".",
      },
      {
        name: "Bible Gateway reading plans",
        detail: "Free one-year plans in many translations. Search \"Bible Gateway reading plans\".",
      },
    ],
  },

  lang: {
    match: [
      /\b(isi)?(zulu|xhosa|ndebele)\b/,
      /\b(se)?(sotho|tswana|pedi)\b/,
      /\b(afrikaans|xitsonga|tsonga|tshivenda|venda|siswati|swati|setswana|sepedi)\b/,
      /learn (a |another )?(new )?language/,
    ],
    milestones: [
      {
        title: "Pick the language and a speaker to practise with",
        tasks: ["Choose one a friend, colleague or neighbour speaks", "Ask them to talk with you once a week"],
      },
      {
        title: "Greetings and introductions",
        tasks: ["Learn how to greet, thank and say goodbye", "Introduce yourself: name, where you're from, what you do"],
      },
      {
        title: "100 everyday phrases",
        tasks: ["10 new phrases a day, said out loud", "Review yesterday's phrases before learning new ones"],
      },
      {
        title: "First 30-second conversation",
        tasks: ["Greet someone and ask how they are, in their language", "Write down words you didn't know and learn them"],
      },
      {
        title: "A 2-minute conversation",
        tasks: ["Talk about your day and your family", "Ask your practice partner to correct you"],
      },
    ],
    tips: [
      "Speak from day one: people love it when you try, mistakes and all.",
      "Little and often: 15 minutes a day beats a long session once a week.",
      "Learn whole phrases, not single words.",
    ],
    resources: [
      {
        name: "A friend who speaks it",
        detail: "The best resource there is. Ask them to only reply in the language for 5 minutes a day.",
      },
      {
        name: "Duolingo",
        detail: "Free app. It includes isiZulu; check the app for the language you want.",
      },
      {
        name: "Free online dictionaries",
        detail: "Search the language name plus \"dictionary\", for example \"isiZulu dictionary\".",
      },
    ],
  },

  swim: {
    match: [/\bswim/],
    milestones: [
      {
        title: "Book lessons or a coach",
        tasks: ["Ask your local municipal pool about adult beginner lessons", "Book your first lesson"],
      },
      {
        title: "Float and breathe comfortably",
        tasks: ["Practise floating on your front and back", "Breathe out into the water, then turn to breathe in"],
      },
      {
        title: "Swim 10 m",
        tasks: ["Kick with a board across the shallow end", "Add arms for a few strokes at a time"],
      },
      {
        title: "Swim 25 m",
        tasks: ["Swim one length, resting at the wall", "Practise twice a week"],
      },
      {
        title: "Swim 50 m non-stop",
        tasks: ["Swim two lengths with a short rest", "Then two lengths without stopping"],
      },
    ],
    tips: [
      "Feeling nervous is normal. Start in the shallow end and go at your own pace.",
      "Relax and breathe out steadily underwater; holding your breath makes you tired fast.",
      "Short, regular sessions build confidence fastest.",
    ],
    resources: [
      {
        name: "A qualified swimming instructor",
        detail: "Municipal pools and swim schools run adult classes. A good teacher makes it far quicker and safer.",
      },
    ],
    caution:
      "Always learn in a pool with a lifeguard or instructor present, and never swim alone in open water.",
  },
};

export function planFor(ideaId: string | null | undefined): Plan | undefined {
  return ideaId ? PLANS[ideaId] : undefined;
}

export function planMilestoneTitles(ideaId: string): string[] {
  return PLANS[ideaId].milestones.map((m) => m.title);
}

/** Plan idea ids whose patterns match a goal title the user typed. */
export function matchPlans(text: string, limit = 3): string[] {
  const t = text.toLowerCase();
  if (t.trim().length < 3) return [];
  return Object.entries(PLANS)
    .filter(([, plan]) => plan.match.some((re) => re.test(t)))
    .map(([id]) => id)
    .slice(0, limit);
}
