import { randomUUID } from "node:crypto";

export function seedDemo(store) {
  if (store.state.chats.length || store.state.alerts.length) return;
  const date = store.now().toISOString();
  store.ingest({
    schemaVersion: 1,
    producer: "sample-sweep",
    checkedAt: date,
    status: "ok",
    coverage: "Sample only · 4 fictional projects; no live sources",
    alerts: [
      {
        id: "template-feedback",
        revision: 1,
        title: "Template-picker icon feedback",
        summary: "Your feedback is recorded in the conversation.",
        priority: "fyi",
        kind: "observed",
        project: "Template library",
        updatedAt: date,
        source: { label: "Fictional design conversation · Sample data" },
        thread: {
          status: "waiting",
          events: [
            {
              id: "request",
              actor: "other",
              author: "Alex",
              text: "Which icon should we use for the template picker?",
              at: new Date(store.now().getTime() - 3600000).toISOString(),
            },
            {
              id: "reply",
              actor: "self",
              author: "You",
              text: "Use the template grid. I’ve added two alternatives to the design file.",
              at: new Date(store.now().getTime() - 1800000).toISOString(),
            },
          ],
        },
      },
      {
        id: "design-review",
        revision: 1,
        title: "Your review moved to tomorrow",
        summary:
          "The design review is now at 10:30. The upload limit and empty-state direction are still open.",
        why: "Two decisions affect the next handoff.",
        nextStep: "Review the prep and choose a direction.",
        priority: "attention",
        kind: "observed",
        project: "Workspace",
        updatedAt: date,
        source: { label: "Sample calendar · Today, 19:08" },
      },
      {
        id: "upload-limit",
        revision: 1,
        title: "A decision is moving without you",
        summary:
          "Engineering is considering a smaller upload limit. The current design assumes a larger one.",
        why: "This could change the flow you are designing.",
        nextStep: "Confirm the limit before the review.",
        priority: "urgent",
        kind: "inferred",
        project: "Upload experience",
        updatedAt: date,
        source: { label: "Sample design channel · Today, 18:42" },
      },
      {
        id: "empty-state",
        revision: 1,
        title: "A useful pattern for the review dialog",
        summary:
          "This sample finding links to the public Axiom dialog guide for the next review flow.",
        why: "It could save you a round of exploration.",
        nextStep:
          "Review the dialog guide before choosing the confirmation flow.",
        action: {
          label: "Open component guide",
          url: "https://optimizely-axiom.github.io/optiaxiom/components/dialog/",
          steps: [
            "Open the Axiom dialog guide.",
            "Review the anatomy and controlled-state example.",
            "Compare the pattern with the confirmation flow you are designing.",
          ],
        },
        priority: "fyi",
        kind: "recommended",
        project: "Design system",
        updatedAt: date,
        source: { label: "Sample library notes · Today, 16:20" },
      },
    ],
  });
  store.state.chats = [
    {
      id: randomUUID(),
      title: "Tomorrow’s design review",
      updatedAt: date,
      messages: [
        {
          role: "assistant",
          text: "The review moved to 10:30 tomorrow.\nI’ve updated your prep.",
          createdAt: date,
          source: "Sample calendar · Today, 19:08",
        },
        { role: "user", text: "What should I focus on?", createdAt: date },
        {
          role: "assistant",
          text: "Two decisions are still open:\n1. Confirm the upload limit.\n2. Choose the empty-state direction.\n\nYour brief is ready to review.",
          createdAt: date,
          artifact: true,
        },
      ],
    },
  ];
  store.save();
}
