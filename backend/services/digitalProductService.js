// ============================================================
// services/digitalProductService.js — Digital Product Generator
// ============================================================
// Generates real, downloadable CSV files based on product title
// and category keywords. No AI API required — all template-based.
//
// Supported templates:
//   - Budget Planner
//   - Study Planner
//   - Workout Tracker
//   - Habit Tracker
//   - Internship / Job Application Tracker
//   - Generic Planner (fallback)
//
// Generated files are saved to: backend/generated-products/
// They persist across server restarts (not in /tmp).
// ============================================================

const fs   = require("fs");
const path = require("path");

// ---- Output Directory ----
// Resolved relative to this file's location so it works regardless
// of which working directory the server is started from.
const OUTPUT_DIR = path.join(__dirname, "..", "generated-products");

// Ensure the output directory exists when this module is first loaded.
// Using recursive: true means it won't throw if the folder already exists.
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ============================================================
// TEMPLATE DEFINITIONS
// Each template is an object with:
//   - keywords  : string[] — matched against lowercased title + category
//   - type      : string   — human-readable label stored in metadata
//   - generate  : fn       — returns a CSV string
// ============================================================

const TEMPLATES = [

  // ----------------------------------------------------------
  // Budget Planner
  // ----------------------------------------------------------
  {
    keywords: ["budget", "finance", "money", "expense", "spending", "savings", "financial"],
    type: "Budget Planner",
    generate: () => {
      const months = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December"
      ];

      const header = [
        "Month",
        "Income",
        "Rent / Mortgage",
        "Utilities",
        "Groceries",
        "Transportation",
        "Entertainment",
        "Healthcare",
        "Savings",
        "Other Expenses",
        "Total Expenses",
        "Net Balance",
        "Notes"
      ].join(",");

      const rows = months.map((month) =>
        [month, "", "", "", "", "", "", "", "", "", "=SUM(C{r}:J{r})", "=B{r}-K{r}", ""]
          .join(",")
      );

      // Add a summary section after the monthly rows
      const summary = [
        "",
        "ANNUAL SUMMARY",
        "Total Annual Income,=SUM(B2:B13)",
        "Total Annual Expenses,=SUM(K2:K13)",
        "Total Annual Savings,=SUM(I2:I13)",
        "Net Annual Balance,=SUM(L2:L13)",
        "",
        "EXPENSE CATEGORIES BREAKDOWN",
        "Category,Total,% of Income",
        "Rent / Mortgage,=SUM(C2:C13),",
        "Utilities,=SUM(D2:D13),",
        "Groceries,=SUM(E2:E13),",
        "Transportation,=SUM(F2:F13),",
        "Entertainment,=SUM(G2:G13),",
        "Healthcare,=SUM(H2:H13),",
        "Savings,=SUM(I2:I13),",
        "Other Expenses,=SUM(J2:J13),"
      ];

      return [header, ...rows, ...summary].join("\n");
    }
  },

  // ----------------------------------------------------------
  // Study Planner
  // ----------------------------------------------------------
  {
    keywords: ["study", "student", "academic", "school", "college", "university", "exam", "homework", "course", "lecture"],
    type: "Study Planner",
    generate: () => {
      const header = [
        "Week",
        "Subject / Course",
        "Topic / Chapter",
        "Study Date",
        "Start Time",
        "End Time",
        "Duration (hrs)",
        "Priority (High/Med/Low)",
        "Status (To Do / In Progress / Done)",
        "Resources Used",
        "Key Concepts to Review",
        "Exam / Due Date",
        "Self-Assessment (1-10)",
        "Notes"
      ].join(",");

      // Pre-populate 8 weeks × 5 subjects = 40 rows
      const weeks = 8;
      const subjects = ["Subject 1","Subject 2","Subject 3","Subject 4","Subject 5"];
      const rows = [];
      for (let w = 1; w <= weeks; w++) {
        for (const subj of subjects) {
          rows.push([`Week ${w}`, subj, "", "", "", "", "", "High", "To Do", "", "", "", "", ""].join(","));
        }
      }

      const tips = [
        "",
        "STUDY TIPS",
        "Tip 1,Use the Pomodoro Technique: 25 min study + 5 min break",
        "Tip 2,Review notes within 24 hours of a lecture for best retention",
        "Tip 3,Practice active recall — test yourself instead of re-reading",
        "Tip 4,Prioritize high-impact topics (past exam papers are your friend)",
        "Tip 5,Get 7-9 hours of sleep — consolidates memory"
      ];

      return [header, ...rows, ...tips].join("\n");
    }
  },

  // ----------------------------------------------------------
  // Workout Tracker
  // ----------------------------------------------------------
  {
    keywords: ["workout", "fitness", "exercise", "gym", "training", "muscle", "cardio", "strength", "weight loss", "health"],
    type: "Workout Tracker",
    generate: () => {
      const header = [
        "Date",
        "Day",
        "Workout Type (Strength / Cardio / Flexibility / Rest)",
        "Exercise Name",
        "Muscle Group",
        "Sets",
        "Reps",
        "Weight (lbs/kg)",
        "Duration (min)",
        "Distance (km/miles)",
        "Calories Burned",
        "RPE (Rate of Perceived Exertion 1-10)",
        "Heart Rate (avg bpm)",
        "Rest Between Sets (sec)",
        "Personal Best?",
        "Notes"
      ].join(",");

      // Pre-fill 12 weeks × 6 workout days
      const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      const exercises = [
        ["Squat","Legs","3","8","","","","",8,"","no",""],
        ["Bench Press","Chest","3","8","","","","",8,"","no",""],
        ["Deadlift","Back","3","5","","","","",9,"","no",""],
        ["Shoulder Press","Shoulders","3","10","","","","",7,"","no",""],
        ["Pull-Ups","Back","3","8","","","","",8,"","no",""],
        ["Running","Cardio","1","","","30","","",6,"5","no",""]
      ];

      const rows = [];
      for (let week = 1; week <= 12; week++) {
        days.forEach((day, i) => {
          const ex = exercises[i];
          rows.push([`Week ${week}`, day, week === 1 && i < 5 ? "Strength" : (i === 5 ? "Cardio" : "Strength"), ...ex].join(","));
        });
        // Sunday rest row
        rows.push([`Week ${week}`, "Sunday", "Rest", "Rest Day", "", "", "", "", "", "", "", "", "", "", "", "Recovery"].join(","));
      }

      const legend = [
        "",
        "RPE SCALE",
        "1-3,Very easy — warm-up / cool-down",
        "4-5,Moderate — sustainable pace",
        "6-7,Challenging — pushing but manageable",
        "8-9,Hard — near max effort",
        "10,Max effort — all out",
        "",
        "GOALS (edit these)",
        "Metric,Goal,Current,Progress",
        "Body Weight (lbs),,,",
        "Bench Press 1RM,,,",
        "Squat 1RM,,,",
        "Deadlift 1RM,,,",
        "5K Run Time,,,"
      ];

      return [header, ...rows, ...legend].join("\n");
    }
  },

  // ----------------------------------------------------------
  // Habit Tracker
  // ----------------------------------------------------------
  {
    keywords: ["habit", "routine", "daily", "tracker", "productivity", "goal", "accountability", "mindfulness", "wellness"],
    type: "Habit Tracker",
    generate: () => {
      // Build day columns for a 31-day month
      const dayCols = Array.from({ length: 31 }, (_, i) => `Day ${i + 1}`);

      const header = [
        "Habit",
        "Category",
        "Target (times/week)",
        "Streak Goal",
        ...dayCols,
        "Monthly Total",
        "Completion %",
        "Notes"
      ].join(",");

      // Default habits to get users started
      const defaultHabits = [
        ["Drink 8 glasses of water", "Health", 7, 30],
        ["Exercise / Move for 30 min", "Fitness", 5, 21],
        ["Read for 20 min", "Learning", 7, 30],
        ["Meditate / Deep breathing", "Mindfulness", 7, 30],
        ["Sleep 7-8 hours", "Sleep", 7, 30],
        ["No social media before 9am", "Focus", 7, 30],
        ["Journal / Gratitude entry", "Mental Health", 5, 21],
        ["Healthy meal prep", "Nutrition", 3, 14],
        ["Study / Practice skill", "Learning", 5, 21],
        ["Connect with someone you care about", "Social", 3, 14],
        ["Habit 11 (add your own)", "Custom", 7, 30],
        ["Habit 12 (add your own)", "Custom", 7, 30]
      ];

      const rows = defaultHabits.map(([habit, cat, target, streakGoal]) => {
        const emptyCells = Array(31).fill("").join(",");
        return `"${habit}",${cat},${target},${streakGoal},${emptyCells},,,"`;
      });

      const legend = [
        "",
        "HOW TO USE",
        "Instructions",
        "Mark each day: ✓ = Done | ✗ = Missed | - = N/A",
        "Update Monthly Total = count of ✓ marks",
        "Completion % = (Monthly Total / 31) × 100",
        "",
        "WEEKLY REVIEW",
        "Week,Wins,Challenges,Adjustments"
      ];
      for (let w = 1; w <= 4; w++) {
        legend.push(`Week ${w},,,`);
      }

      return [header, ...rows, ...legend].join("\n");
    }
  },

  // ----------------------------------------------------------
  // Internship / Job Application Tracker
  // ----------------------------------------------------------
  {
    keywords: [
      "internship", "job", "application", "career", "resume", "interview",
      "hiring", "recruitment", "employment", "work", "position", "apply"
    ],
    type: "Job Application Tracker",
    generate: () => {
      const header = [
        "Date Applied",
        "Company Name",
        "Job Title",
        "Location (City / Remote)",
        "Job Type (Full-time / Part-time / Internship / Contract)",
        "Industry",
        "Application Portal",
        "Job Posting URL",
        "Contact Person",
        "Contact Email",
        "Resume Version Used",
        "Cover Letter? (Yes/No)",
        "Referral? (Yes/No/Name)",
        "Application Status",
        "Phone Screen Date",
        "Phone Screen Notes",
        "1st Interview Date",
        "1st Interview Format (Video/Phone/In-person)",
        "1st Interview Notes",
        "2nd Interview Date",
        "2nd Interview Notes",
        "Take-Home Assignment? (Yes/No)",
        "Offer Received? (Yes/No)",
        "Offer Amount",
        "Offer Deadline",
        "Decision (Accepted/Declined/Pending)",
        "Rejection Date",
        "Follow-up Sent? (Yes/No)",
        "Notes / Next Steps"
      ].join(",");

      // Application status options (for reference)
      const statusOptions = [
        "Applied",
        "Application Viewed",
        "Phone Screen Scheduled",
        "Phone Screen Complete",
        "Interview Scheduled",
        "Interview Complete",
        "Final Round",
        "Offer Received",
        "Offer Accepted",
        "Offer Declined",
        "Rejected",
        "Ghosted",
        "Withdrawn"
      ];

      // 50 empty rows for tracking
      const emptyRows = Array(50).fill(
        Array(29).fill("").join(",")
      );

      const reference = [
        "",
        "STATUS OPTIONS (for reference)",
        ...statusOptions.map((s, i) => `${i + 1},${s}`),
        "",
        "MONTHLY SUMMARY",
        "Month,Applications Sent,Phone Screens,Interviews,Offers,Rejections,Response Rate",
        "January,,,,,,",
        "February,,,,,,",
        "March,,,,,,",
        "April,,,,,,",
        "May,,,,,,",
        "June,,,,,,",
        "July,,,,,,",
        "August,,,,,,",
        "September,,,,,,",
        "October,,,,,,",
        "November,,,,,,",
        "December,,,,,,"
      ];

      return [header, ...emptyRows, ...reference].join("\n");
    }
  }
];

// ============================================================
// detectTemplate(title, category)
// ============================================================
// Scans the product's title and category against each template's
// keyword list. Returns the first matching template, or falls
// back to the Generic Planner template.
// ============================================================
const detectTemplate = (title = "", category = "") => {
  const haystack = `${title} ${category}`.toLowerCase();

  for (const template of TEMPLATES) {
    const matched = template.keywords.some((kw) => haystack.includes(kw));
    if (matched) return template;
  }

  // Fallback — Generic Planner
  return {
    type: "Generic Planner",
    generate: () => {
      const header = [
        "Date",
        "Task / Item",
        "Category",
        "Priority (High/Med/Low)",
        "Status (To Do / In Progress / Done)",
        "Due Date",
        "Assigned To",
        "Est. Time (hrs)",
        "Actual Time (hrs)",
        "Notes"
      ].join(",");

      const rows = Array(50).fill(
        ["", "", "General", "Medium", "To Do", "", "", "", "", ""].join(",")
      );

      const tips = [
        "",
        "TIPS",
        "Prioritize daily,Start each day by marking your top 3 Most Important Tasks",
        "Time blocking,Assign tasks to specific time blocks to stay focused",
        "Weekly review,Every Sunday review wins and plan the upcoming week"
      ];

      return [header, ...rows, ...tips].join("\n");
    }
  };
};

// ============================================================
// generateDigitalProduct(product)
// ============================================================
// Main entry point called by the route handler.
//
// 1. Detects the best-matching CSV template
// 2. Generates the CSV content string
// 3. Writes the file to disk in generated-products/
// 4. Returns metadata object to be stored in product.generatedFiles
//
// Files are named: {productId}-{timestamp}-{slug}.csv
// This ensures uniqueness even if a product is regenerated.
// ============================================================
const generateDigitalProduct = (product) => {
  const template = detectTemplate(product.title, product.category);

  // Build a safe filename slug from the product title
  const slug = product.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")   // replace non-alphanumeric with dash
    .replace(/^-+|-+$/g, "")        // trim leading/trailing dashes
    .slice(0, 40);                   // keep filenames reasonable length

  const timestamp = Date.now();
  const filename  = `${product.id}-${timestamp}-${slug}.csv`;
  const filepath  = path.join(OUTPUT_DIR, filename);

  // Generate the CSV content
  const csvContent = template.generate();

  // Write to disk synchronously — file is small (< 50 KB) so this is fine
  fs.writeFileSync(filepath, csvContent, "utf8");

  console.log(`📄 Generated digital product: ${filename} (${template.type})`);

  // Return metadata to be stored in SQLite alongside the product
  return {
    filename,
    type: template.type,
    // URL path — served statically by Express from /downloads/*
    url: `/downloads/${filename}`,
    createdAt: new Date().toISOString()
  };
};

module.exports = { generateDigitalProduct };
