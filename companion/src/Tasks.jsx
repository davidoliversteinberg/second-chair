import { useState } from "react";
import {
  Button,
  Checkbox,
  Heading,
  Text,
  Input,
  DateInput,
  Textarea,
  SearchInput,
  SegmentedControl,
  SegmentedControlItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@optiaxiom/react";
import { IconPlus } from "@optiaxiom/icons";
import { localDay, taskGroup } from "../server/task-dates.mjs";

const groups = ["Overdue", "Today", "Upcoming", "No date", "Done"];
export function Tasks({ data, action, edit, openFinding, settings }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("open");
  const [busy, setBusy] = useState(null);
  const today = localDay();
  const tasks = data.tasks || [];
  const visible = tasks
    .filter(
      (t) =>
        (filter === "done" ? !!t.completedAt : !t.completedAt) &&
        `${t.title} ${t.notes}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        (a.dueDate || "9999").localeCompare(b.dueDate || "9999") ||
        b.createdAt.localeCompare(a.createdAt),
    );
  async function complete(task, completed) {
    setBusy(task.id);
    try {
      await action("tasks/update", {
        id: task.id,
        revision: task.revision,
        completed,
      });
    } finally {
      setBusy(null);
    }
  }
  const reminders =
    data.settings.taskReminders &&
    data.settings.notifications &&
    !data.settings.paused;
  return (
    <div className="content task-queue">
      <div className="task-controls">
        <div className="task-topline">
          <SegmentedControl
            aria-label="Task filter"
            value={filter}
            onValueChange={(v) => v && setFilter(v)}
          >
            <SegmentedControlItem value="open">
              To do ({tasks.filter((t) => !t.completedAt).length})
            </SegmentedControlItem>
            <SegmentedControlItem value="done">
              Done ({tasks.filter((t) => t.completedAt).length})
            </SegmentedControlItem>
          </SegmentedControl>
          <Button
            size="sm"
            appearance="primary"
            icon={<IconPlus />}
            onClick={() =>
              edit({
                requestId: crypto.randomUUID(),
                title: "",
                dueDate: null,
                notes: "",
              })
            }
          >
            New task
          </Button>
        </div>
        <SearchInput
          aria-label="Search tasks"
          placeholder="Search tasks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onValueClear={() => setQuery("")}
        />
      </div>
      <div className="task-list scroll" aria-label="Tasks">
        {!visible.length && (
          <div className="queue-empty">
            <Heading level="3">
              {query
                ? "No matching tasks"
                : filter === "done"
                  ? "Completed tasks will stay here"
                  : "Make room for what needs doing"}
            </Heading>
            <Text>
              {query
                ? "Try a different word or clear your search."
                : filter === "done"
                  ? "Uncheck a task to bring it back to To do."
                  : "Save a finding with its + button, or add a task of your own."}
            </Text>
            {query && (
              <Button onClick={() => setQuery("")}>Clear search</Button>
            )}
          </div>
        )}
        {groups.map((group) => {
          const rows = visible.filter((t) => taskGroup(t, today) === group);
          return (
            !!rows.length && (
              <section key={group} className="task-group" aria-label={group}>
                <Heading
                  level="4"
                  className={group === "Overdue" ? "task-overdue" : ""}
                >
                  {group}{" "}
                  <span className="task-group-count">{rows.length}</span>
                </Heading>
                {rows.map((task) => {
                  const finding = data.alerts.find(
                    (a) => a.key === task.findingKey,
                  );
                  return (
                    <article
                      key={task.id}
                      className={`task-row ${task.completedAt ? "task-done" : ""}`}
                    >
                      <Checkbox
                        aria-label={`${task.completedAt ? "Reopen" : "Complete"}: ${task.title}`}
                        checked={!!task.completedAt}
                        disabled={busy === task.id}
                        onCheckedChange={(v) => complete(task, v)}
                      />
                      <div className="task-row-main">
                        <Button
                          className="task-title"
                          appearance="subtle"
                          onClick={() => edit({ ...task })}
                        >
                          <span className="task-label">{task.title}</span>
                        </Button>
                        <div className="task-meta">
                          {task.dueDate && (
                            <time dateTime={task.dueDate}>
                              {new Date(
                                `${task.dueDate}T12:00:00`,
                              ).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </time>
                          )}
                          {finding ? (
                            <Button
                              size="sm"
                              appearance="subtle"
                              className="task-source"
                              onClick={() => openFinding(finding)}
                            >
                              <span className="task-label">
                                View thread · {finding.project}
                              </span>
                            </Button>
                          ) : task.findingKey ? (
                            <span>Original finding unavailable</span>
                          ) : (
                            <span>Personal task</span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            )
          );
        })}
      </div>
      <div className="task-reminder">
        <Button size="sm" appearance="subtle" onClick={settings}>
          {reminders
            ? `Daily reminder · ${String(data.settings.taskReminderHour).padStart(2, "0")}:00`
            : "Daily reminders off"}{" "}
          · Preferences
        </Button>
      </div>
    </div>
  );
}

export function TaskEditor({ task, setTask, action, onSaved, finding }) {
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  async function save(e) {
    e.preventDefault();
    if (saving || !task.title.trim()) return;
    setSaving(true);
    setFailure("");
    const fields = {
      title: task.title,
      dueDate: task.dueDate || null,
      notes: task.notes || "",
    };
    try {
      const result = await action(
        task.id ? "tasks/update" : "tasks/create",
        task.id
          ? { ...fields, id: task.id, revision: task.revision }
          : {
              ...fields,
              requestId: task.requestId,
              ...(task.findingKey ? { findingKey: task.findingKey } : {}),
            },
      );
      if (result) onSaved(result.taskId || task.id);
      else setFailure("Could not save. Your changes are kept here; try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) setTask(null);
      }}
    >
      <DialogContent size="sm">
        <DialogHeader
          description={
            finding
              ? "Linked to the original finding and its conversation."
              : "Saved on this Mac. Set a date to keep it on your radar."
          }
        >
          {task.id ? "Edit task" : "Add to To do"}
        </DialogHeader>
        <form onSubmit={save}>
          <DialogBody className="task-form">
            <div>
              <label htmlFor="task-title">Task</label>
              <Input
                id="task-title"
                value={task.title}
                onChange={(e) => setTask({ ...task, title: e.target.value })}
                maxLength={240}
                required
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="task-due">Due date (optional)</label>
              <DateInput
                id="task-due"
                type="date"
                value={task.dueDate || ""}
                onChange={(e) =>
                  setTask({ ...task, dueDate: e.target.value || null })
                }
              />
            </div>
            <div>
              <label htmlFor="task-notes">Notes</label>
              <Textarea
                id="task-notes"
                rows={3}
                maxLength={4000}
                value={task.notes || ""}
                onChange={(e) => setTask({ ...task, notes: e.target.value })}
              />
            </div>
            {finding && (
              <Text className="task-linked-caption">From: {finding.title}</Text>
            )}
            {failure && <Text role="alert">{failure}</Text>}
          </DialogBody>
          <DialogFooter>
            <DialogClose disabled={saving}>Cancel</DialogClose>
            <Button
              type="submit"
              appearance="primary"
              disabled={saving || !task.title.trim()}
            >
              {saving ? "Saving…" : "Save task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
