import { randomUUID } from "node:crypto";

export function seedDemo(store) {
  if (store.state.chats.length || store.state.alerts.length) return;
  const date = store.now().toISOString();
  store.ingest({
    schemaVersion: 1,
    producer: "sample-sweep",
    checkedAt: date,
    status: "ok",
    coverage: "Sample only · 3 projects, 4 channels, 2 meeting notes",
    alerts: [
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
        title: "A useful pattern for the empty state",
        summary:
          "The library team has documented a first-use pattern that could fit this flow.",
        why: "It could save you a round of exploration.",
        nextStep: "Compare the pattern with your current direction.",
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
