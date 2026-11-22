(() => {
  const SUBJECTS = {
    en: { cs: "Computer Science", bio: "Biology", math: "Mathematics", eng: "English" },
    mk: { cs: "Информатика", bio: "Биологија", math: "Математика", eng: "Англиски јазик" },
  };

  const NOTES = {
    en: [
      {
        s: "cs",
        title: "C++ data types and loops",
        body: `## Data types
- int - whole numbers, e.g. 42
- double - decimal numbers, e.g. 3.14
- char - a single character, e.g. 'A'
- bool - true or false
- string - text, e.g. "hello"

Integer division drops the remainder: 7 / 2 = 3, but 7.0 / 2 = 3.5.
The % operator gives the remainder: 7 % 2 = 1.

## Loops
- for loop - repeats a known number of times
- while loop - repeats while a condition is true
- do-while loop - runs at least once and checks the condition at the end

A break statement stops a loop early. A continue statement skips to the next pass.`,
      },
      {
        s: "bio",
        title: "Photosynthesis",
        body: `Photosynthesis is how plants turn light energy into chemical energy.

- Chloroplast - the organelle where photosynthesis happens
- Chlorophyll - the green pigment that absorbs light
- Stomata - small pores in leaves that let carbon dioxide in

Equation: carbon dioxide + water + light → glucose + oxygen
(6CO2 + 6H2O → C6H12O6 + 6O2)

The light-dependent reactions happen in the thylakoids and make ATP and NADPH.
The Calvin cycle happens in the stroma and uses ATP and NADPH to build glucose.`,
      },
      {
        s: "math",
        title: "Quadratic equations",
        body: `A quadratic equation has the form ax² + bx + c = 0, where a ≠ 0.

- Discriminant - D = b² − 4ac
- Two real roots - when D > 0
- One double root - when D = 0
- No real roots - when D < 0

Quadratic formula: x = (−b ± √D) / 2a

Example: x² − 5x + 6 = 0, so D = 25 − 24 = 1 and x = 2 or x = 3.
Vieta's formulas: x1 + x2 = −b/a and x1 · x2 = c/a.`,
      },
    ],
    mk: [
      {
        s: "cs",
        title: "Типови податоци и циклуси во C++",
        body: `## Типови податоци
- int - цели броеви, на пр. 42
- double - децимални броеви, на пр. 3.14
- char - еден знак, на пр. 'A'
- bool - точно или неточно (true/false)
- string - текст, на пр. "здраво"

Целобројното делење го фрла остатокот: 7 / 2 = 3, но 7.0 / 2 = 3.5.
Операторот % го дава остатокот: 7 % 2 = 1.

## Циклуси
- for циклус - се повторува познат број пати
- while циклус - се повторува додека условот е точен
- do-while циклус - се извршува барем еднаш, а условот се проверува на крајот

Наредбата break го прекинува циклусот порано. Наредбата continue скока на следното повторување.`,
      },
      {
        s: "bio",
        title: "Фотосинтеза",
        body: `Фотосинтезата е процес во кој растенијата ја претвораат светлинската енергија во хемиска енергија.

- Хлоропласт - органела во која се одвива фотосинтезата
- Хлорофил - зелен пигмент што ја апсорбира светлината
- Стоми - мали пори на листовите низ кои влегува јаглерод диоксид

Равенка: јаглерод диоксид + вода + светлина → гликоза + кислород
(6CO2 + 6H2O → C6H12O6 + 6O2)

Светлинските реакции се одвиваат во тилакоидите и создаваат ATP и NADPH.
Калвиновиот циклус се одвива во стромата и ги користи ATP и NADPH за да создаде гликоза.`,
      },
      {
        s: "math",
        title: "Квадратни равенки",
        body: `Квадратната равенка има облик ax² + bx + c = 0, каде a ≠ 0.

- Дискриминанта - D = b² − 4ac
- Две реални решенија - кога D > 0
- Едно двојно решение - кога D = 0
- Нема реални решенија - кога D < 0

Формула за решенијата: x = (−b ± √D) / 2a

Пример: x² − 5x + 6 = 0, па D = 25 − 24 = 1 и x = 2 или x = 3.
Виетови формули: x1 + x2 = −b/a и x1 · x2 = c/a.`,
      },
    ],
  };

  const CARDS = {
    en: [
      ["cs", "Which C++ type stores whole numbers?", "int"],
      ["cs", "What does 7 / 2 give when both numbers are int?", "3, because integer division drops the remainder"],
      ["cs", "What does the % operator return?", "The remainder of a division, e.g. 7 % 2 = 1"],
      ["cs", "Which loop always runs at least once?", "do-while"],
      ["cs", "When do you use a for loop?", "When you know how many times to repeat"],
      ["cs", "What does break do inside a loop?", "Stops the loop immediately"],
      ["cs", "Which type holds true or false?", "bool"],
      ["bio", "Where in the cell does photosynthesis happen?", "In the chloroplasts"],
      ["bio", "Which pigment absorbs light for photosynthesis?", "Chlorophyll"],
      ["bio", "Which gas do plants release in photosynthesis?", "Oxygen (O2)"],
      ["bio", "What are stomata?", "Small pores in leaves that let CO2 in"],
      ["bio", "Where does the Calvin cycle take place?", "In the stroma of the chloroplast"],
      ["bio", "What do the light-dependent reactions produce?", "ATP and NADPH"],
      ["math", "What is the formula for the discriminant?", "D = b² − 4ac"],
      ["math", "How many real roots are there if D > 0?", "Two different real roots"],
      ["math", "How many real roots are there if D < 0?", "None"],
      ["math", "What is the quadratic formula?", "x = (−b ± √D) / 2a"],
      ["math", "Vieta: x1 + x2 = ?", "−b/a"],
      ["math", "Solve x² − 5x + 6 = 0", "x = 2 or x = 3"],
      ["eng", "Past simple of “go”", "went"],
      ["eng", "Past participle of “write”", "written"],
      ["eng", "A synonym for “happy”", "cheerful, glad"],
      ["eng", "The opposite of “ancient”", "modern"],
      ["eng", "When do we use the present perfect?", "For past actions connected to now, e.g. I have finished"],
    ],
    mk: [
      ["cs", "Кој тип во C++ чува цели броеви?", "int"],
      ["cs", "Колку е 7 / 2 кога двата броја се int?", "3, бидејќи целобројното делење го фрла остатокот"],
      ["cs", "Што враќа операторот %?", "Остатокот од делењето, на пр. 7 % 2 = 1"],
      ["cs", "Кој циклус секогаш се извршува барем еднаш?", "do-while"],
      ["cs", "Кога се користи for циклус?", "Кога знаеш колку пати треба да се повтори"],
      ["cs", "Што прави break во циклус?", "Веднаш го прекинува циклусот"],
      ["cs", "Кој тип чува точно или неточно?", "bool"],
      ["bio", "Каде во клетката се одвива фотосинтезата?", "Во хлоропластите"],
      ["bio", "Кој пигмент ја апсорбира светлината при фотосинтезата?", "Хлорофилот"],
      ["bio", "Кој гас го ослободуваат растенијата при фотосинтезата?", "Кислород (O2)"],
      ["bio", "Што се стоми?", "Мали пори на листовите низ кои влегува CO2"],
      ["bio", "Каде се одвива Калвиновиот циклус?", "Во стромата на хлоропластот"],
      ["bio", "Што создаваат светлинските реакции?", "ATP и NADPH"],
      ["math", "Која е формулата за дискриминанта?", "D = b² − 4ac"],
      ["math", "Колку реални решенија има ако D > 0?", "Две различни реални решенија"],
      ["math", "Колку реални решенија има ако D < 0?", "Ниту едно"],
      ["math", "Која е формулата за решенијата на квадратна равенка?", "x = (−b ± √D) / 2a"],
      ["math", "Виет: x1 + x2 = ?", "−b/a"],
      ["math", "Реши ја x² − 5x + 6 = 0", "x = 2 или x = 3"],
      ["eng", "Минато просто време од „go“", "went"],
      ["eng", "Трета форма (past participle) од „write“", "written"],
      ["eng", "Синоним за „happy“", "cheerful, glad"],
      ["eng", "Спротивно од „ancient“", "modern"],
      ["eng", "Кога се користи present perfect?", "За минати дејства поврзани со сега, на пр. I have finished"],
    ],
  };

  const SRS = [
    [3, 8, 2.5, 4], [1, 2, 2.3, 0], [0, 0, 2.5, 0], [4, 25, 2.6, 12], [2, 5, 2.5, -1], [0, 0, 2.5, 0], [5, 30, 2.7, 20],
    [2, 4, 2.5, 0], [3, 9, 2.5, 3], [1, 2, 2.2, 0], [0, 0, 2.5, 0], [0, 0, 2.5, 0], [2, 5, 2.4, 2],
    [4, 22, 2.6, 10], [3, 10, 2.5, 5], [2, 4, 2.5, 0], [1, 2, 2.1, 0], [0, 0, 2.5, 0], [3, 12, 2.5, 6],
    [5, 40, 2.8, 25], [4, 21, 2.6, 9], [2, 6, 2.5, 1], [1, 2, 2.5, 0], [0, 0, 2.5, 0],
  ];

  const PLAN = {
    en: [
      { type: "exam", s: "cs", title: "C++ test: data types and loops", offset: 5 },
      { type: "exam", s: "bio", title: "Biology exam: photosynthesis", offset: 12 },
      { type: "task", s: "math", title: "Math homework, page 54", offset: 0, minutes: 30 },
      { type: "task", s: "eng", title: "Read chapter 3 of the English reader", offset: 0, minutes: 20, done: true },
    ],
    mk: [
      { type: "exam", s: "cs", title: "Тест по C++: типови и циклуси", offset: 5 },
      { type: "exam", s: "bio", title: "Испит по биологија: фотосинтеза", offset: 12 },
      { type: "task", s: "math", title: "Домашна по математика, стр. 54", offset: 0, minutes: 30 },
      { type: "task", s: "eng", title: "Прочитај го 3. поглавје по англиски", offset: 0, minutes: 20, done: true },
    ],
  };

  const ACTIVITY = [
    [-9, 25, 10, 0, "math"],
    [-8, 50, 14, 5, "cs"],
    [-6, 25, 8, 0, "bio"],
    [-5, 50, 18, 10, "cs"],
    [-4, 25, 12, 0, "math"],
    [-3, 75, 20, 10, "bio"],
    [-2, 25, 9, 0, "eng"],
    [-1, 50, 16, 10, "cs"],
  ];

  const QUIZZES = [
    { s: "cs", offset: -5, total: 10, correct: 8 },
    { s: "bio", offset: -3, total: 10, correct: 6 },
    { s: "cs", offset: -1, total: 10, correct: 9 },
  ];

  const COLORS = { cs: "#2b4fd8", bio: "#2e8b57", math: "#d1432f", eng: "#c7801a" };

  M.sample = (lang) => {
    const L = lang === "mk" ? "mk" : "en";
    return {
      subjects: Object.keys(COLORS).map((key) => ({ key, name: SUBJECTS[L][key], color: COLORS[key] })),
      notes: NOTES[L],
      cards: CARDS[L].map(([s, f, b], i) => ({ s, f, b, srs: SRS[i] })),
      plan: PLAN[L],
      activity: ACTIVITY,
      quizzes: QUIZZES,
    };
  };
})();
