# To do — 0.5.0

## Save something you need to do

1. In **For you**, click **+** next to a finding (tooltip: Add to To do). A finding thread also has **Add to To do**.
2. Keep or rewrite its title as your task. Choose an optional date and add private notes.
3. **Save task** opens **To do**. The task retains its finding link, even if you rename it.
4. Use **View thread** for the reported conversation, your private notes, agent answers, and source links.

For work without a finding, choose **To do → New task**. Adding a finding a second time edits its
existing task, even if done. This avoids duplicate reminders. Tasks are not created automatically
for every email; email scans still surface obligations in For you for you to choose.

## Work through your list

Open tasks are grouped **Overdue → Today → Upcoming → No date**, sorted by due date then newest
creation. Search matches titles and notes. Click a title to edit. Check the box when done; **Done**
keeps the history and lets you uncheck to reopen. A read finding and a done task are independent.

Dates are calendar days in the Mac’s local timezone, not UTC timestamps. A task becomes overdue
on the day after its due date. No date means it is still unfinished and included in the daily
summary, without a false deadline. A date from a source is prefilled when available; review it.
Later source changes do not silently reschedule a task you own. Follow the linked thread for new evidence.

Checking off a task does not mark its finding done, submit an approval, finish training, or send a
message. Likewise, reading an email or closing a finding does not complete a personal task.

## Daily Mac reminders

Defaults: enabled, **09:00 local time**, one summary per day if any tasks remain open. The summary
contains counts of unfinished, overdue and due-today tasks. It never displays task titles or notes,
even if finding title previews are enabled. Clicking it opens **To do**.

Change **Preferences → Daily to-do reminder / Reminder time**. Desktop notifications must also
be enabled. Pause and quiet hours defer delivery. An empty or fully completed list sends nothing.
Changing the time after today’s reminder was delivered does not send a second reminder.

The app checks local task reminders on its existing 30-second polling cycle and when waking. The
last delivery day is saved alongside tasks. Launching or waking after the scheduled hour catches
up once outside quiet hours. Days spent asleep or quit are not replayed. The Mac must be awake and
Second Chair running; closing its window keeps it in the menu bar. **Start at login** can reopen it
at sign-in, subject to your macOS settings. macOS notification permission and Focus can suppress or
delay the banner. Accepting a notification for delivery is not proof that you saw it.

Browser mode has the same tasks but cannot send native banners. It does not mark the reminder
as delivered. Opening the native app later can deliver the current day’s reminder.

## Storage and limits

Tasks and the delivery marker live in the existing private `state.json`, saved atomically. Updates
carry a revision: a stale editor cannot overwrite a newer task. Creation retries are idempotent.
Existing chats, findings, source coverage and scanner settings are preserved on upgrade.

This is a local list, with no Apple Reminders/Microsoft To Do sync and no sync to the Claude
plugin’s separate task board. One task can link to one finding; custom subtasks, recurring tasks,
multiple assignees and task deletion are not included. Mark an unwanted task Done to remove it from
the open queue while keeping its history. Tasks are yours to edit and complete, not silently changed
by the email scanner.

Creating, editing and reminding use **zero model calls**. When you chat, Claude may receive up to
50 open tasks (plus eligible completed tasks for the selected finding), each with up to 500 note
characters, as part of its bounded context. Existing chat usage applies; chat cannot mutate tasks.
