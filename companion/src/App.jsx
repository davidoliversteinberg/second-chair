import { useEffect, useRef, useState } from "react";
import { BrandMark } from "./BrandMark.jsx";
import {
  Button,
  Heading,
  Text,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Menu,
  MenuTrigger,
  MenuContent,
  EllipsisMenuButton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@optiaxiom/react";
import {
  IconGear,
  IconPlus,
  IconClockRotateLeft,
  IconArrowUpRightFromSquare,
  IconCircleExclamation,
  IconXmark,
  IconCircle,
} from "@optiaxiom/icons";
import { Chat, Inbox, Settings, Health, History, Usage } from "./Views.jsx";
import { FindingThread } from "./FindingThread.jsx";
import { needsYou } from "../server/finding-state.mjs";
import { contentFreshness, reportDate } from "./inbox.mjs";
export const time = (value) =>
  value
    ? new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "not yet";
const native = new URLSearchParams(location.search).has("native");

export function App() {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  const [tab, setTab] = useState("chat"),
    [view, setView] = useState("main");
  const [chatId, setChatId] = useState(null),
    [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState(null),
    [selected, setSelected] = useState(null);
  const [threadDrafts, setThreadDrafts] = useState({});
  const [inbox, setInbox] = useState({
    filter: "unread",
    query: "",
    sort: "newest",
    page: 0,
    scroll: 0,
  });
  function openFinding(alert) {
    setTab("for-you");
    setSelected(alert);
    if (alert.state === "new" && needsYou(alert))
      void action("alerts/read", {
        items: [{ key: alert.key, revision: alert.revision }],
      });
  }
  const [openLink, setOpenLink] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [deskOpening, setDeskOpening] = useState(false);
  const [deskProblem, setDeskProblem] = useState(null);
  const historyTrigger = useRef(null);
  const chatDrafts = useRef(new Map());
  const showHistory = () => {
    historyTrigger.current = document.activeElement;
    setHistoryOpen(true);
  };
  const navigate = (next) =>
    next === "history" ? showHistory() : setView(next);
  const [desk, setDesk] = useState(
    new URLSearchParams(location.search).has("desk"),
  );
  const linkTrigger = useRef(null);
  const openSource = (url) => {
    linkTrigger.current = document.activeElement;
    setOpenLink(url);
  };
  const token = useRef(""),
    initialized = useRef(false);
  useEffect(() => {
    let alive = true;
    let loading = false;
    async function refresh() {
      if (loading) return;
      loading = true;
      try {
        const response = await fetch("/api/state", {
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error();
        const state = await response.json();
        if (!alive) return;
        token.current = state.token;
        setData(state);
        setConnectionError("");
        if (!initialized.current) {
          setChatId(state.chats[0]?.id || null);
          if (!state.demo) setTab("for-you");
          initialized.current = true;
        }
      } catch {
        if (alive)
          setConnectionError(
            "Second Chair is disconnected. Reopen the menu-bar app if it has quit. This page will reconnect automatically.",
          );
      } finally {
        loading = false;
      }
    }
    void refresh();
    const healthTimer = setInterval(refresh, 30000);
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", onVisible);
    const events = new EventSource("/api/events");
    events.onmessage = (e) => {
      if (alive) setData(JSON.parse(e.data));
    };
    events.onerror = () => {
      if (alive)
        setConnectionError("Connection interrupted. Trying to reconnect…");
    };
    events.onopen = () => {
      void refresh(); // Refresh the mutation token after server restart, too.
    };
    return () => {
      alive = false;
      events.close();
      clearInterval(healthTimer);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  async function action(route, value) {
    setError("");
    try {
      const response = await fetch("/api/" + route, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Second-Chair-Token": token.current,
        },
        body: JSON.stringify(value),
      });
      const result = await response.json();
      if (response.status === 403) {
        const state = await (await fetch("/api/state")).json();
        token.current = state.token;
        setData(state);
        throw new Error(
          "Reconnected to Second Chair. Please try that action again.",
        );
      }
      if (!response.ok)
        throw new Error(result.error || "That action could not be completed");
      return result;
    } catch (e) {
      setError(e.message);
      return null;
    }
  }
  const openChat = (id) => {
    chatDrafts.current.set(chatId, { draft, attachment });
    const saved = chatDrafts.current.get(id);
    setDraft(saved?.draft || "");
    setAttachment(saved?.attachment || null);
    setHistoryOpen(false);
    setChatId(id);
    setTab("chat");
    setView("main");
    setSelected(null);
  };
  const newChat = () => {
    openChat(null);
    setDraft("");
    setAttachment(null);
  };
  async function openDesk() {
    if (!native) {
      setDesk(!desk);
      return;
    }
    setDeskOpening(true);
    setDeskProblem(null);
    try {
      if (!window.secondChair?.openDesk)
        throw new Error(
          "Reopen the updated Second Chair app to open your desk.",
        );
      const result = await window.secondChair.openDesk();
      if (!result.ok) setDeskProblem(result);
    } catch (e) {
      setDeskProblem({ error: e.message, url: location.origin + "/?desk=1" });
    } finally {
      setDeskOpening(false);
    }
  }
  const settings = () => {
    setView("settings");
  };
  if (!data)
    return (
      <main className="stage">
        <section className="panel loading">
          <BrandMark size={38} />
          <Heading level="2" asChild>
            <h1>Second Chair</h1>
          </Heading>
          <p>{connectionError || error || "Opening your desk…"}</p>
          {(connectionError || error) && (
            <Button onClick={() => location.reload()}>Try again</Button>
          )}
        </section>
      </main>
    );
  const active = data.alerts.filter(
    (a) => a.state !== "resolved" && needsYou(a),
  );
  const sources = Object.entries(data.sources);
  const freshness = contentFreshness(data.sources);
  const issue =
    freshness.stale ||
    data.problems.length > 0 ||
    sources.some(
      ([, s]) =>
        s.status !== "ok" || Date.now() - Date.parse(s.checkedAt) > 86400000,
    );
  const status = data.settings.paused
    ? "Report monitoring paused"
    : data.demo
      ? "Sample preview"
      : freshness.stale
        ? "Reports need refreshing"
        : "Local reports available";
  const common = { data, action, setView: navigate };
  return (
    <main className={`stage ${native ? "native" : ""} ${desk ? "desk" : ""}`}>
      {desk && (
        <aside className="desk-note">
          <div className="eyebrow">YOUR SECOND CHAIR</div>
          <h2 className="desk-display">
            A little less
            <br />
            on your mind.
          </h2>
          <Text className="desk-description">
            The decisions, loose ends, and conversations worth keeping close.
          </Text>
          <div className="desk-stat">
            <strong>{active.length}</strong>
            <span>things on your radar</span>
          </div>
          <Button
            appearance="inverse"
            icon={<IconArrowUpRightFromSquare />}
            iconPosition="end"
            onClick={() => setView("health")}
          >
            View source health
          </Button>
          <p className="small">
            {data.demo
              ? "You are exploring with sample data."
              : "Private files on this device. Claude requests use the cloud when configured."}
          </p>
        </aside>
      )}
      <section className="panel" aria-label="Second Chair companion">
        {native && <div className="window-drag-handle" aria-hidden="true" />}
        <header
          className="header"
          title={native ? "Drag to move window" : undefined}
        >
          <BrandMark size={30} />
          <div className="brand">
            <div className="brand-line">
              <Heading level="2" asChild>
                <h1>Second Chair</h1>
              </Heading>
              {data.demo && <span className="badge">Sample preview</span>}
            </div>
          </div>
          <Menu
            options={[
              {
                label: "Preferences",
                addon: <IconGear filled />,
                execute: settings,
              },
              {
                label: "Source health",
                addon: <IconClockRotateLeft filled />,
                execute: () => setView("health"),
              },
              {
                label: "Chat history",
                addon: <IconClockRotateLeft filled />,
                execute: showHistory,
              },
              {
                label: "Usage and cadence",
                addon: <IconClockRotateLeft filled />,
                execute: () => setView("usage"),
              },
              {
                label: "New chat",
                addon: <IconPlus filled />,
                execute: newChat,
              },
            ]}
          >
            <MenuTrigger asChild>
              <EllipsisMenuButton
                aria-label="More options"
                appearance="subtle"
              />
            </MenuTrigger>
            <MenuContent />
          </Menu>
        </header>
        <Tabs
          className="main-tabs"
          value={tab}
          onValueChange={(value) => {
            setTab(value);
            setView("main");
            setSelected(null);
          }}
        >
          <TabsList aria-label="Main navigation">
            <TabsTrigger
              value="for-you"
              addonAfter={
                active.some((a) => a.state === "new") ? (
                  <span className="count">
                    {active.filter((a) => a.state === "new").length}
                  </span>
                ) : undefined
              }
            >
              For you
            </TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>
          <TabsContent className="tab-body" value={tab}>
            {connectionError && (
              <div className="error" role="status">
                {connectionError}
              </div>
            )}
            {deskProblem && (
              <div className="error desk-problem" role="alert">
                <span>
                  {deskProblem.error}
                  <br />
                  <code>{deskProblem.url}</code>
                </span>
                <Button
                  appearance="subtle"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(deskProblem.url)
                      .then(() =>
                        setDeskProblem({
                          ...deskProblem,
                          error: "Address copied. Paste it into your browser.",
                        }),
                      )
                      .catch(() =>
                        setError("Select and copy the address above."),
                      );
                  }}
                >
                  Copy address
                </Button>
              </div>
            )}
            {error && (
              <div className="error" role="alert">
                <IconCircleExclamation size={20} />
                <span>{error}</span>
                <Button
                  appearance="subtle"
                  aria-label="Dismiss error"
                  icon={<IconXmark />}
                  onClick={() => setError("")}
                />
              </div>
            )}
            {view === "settings" ? (
              <Settings {...common} />
            ) : view === "health" ? (
              <Health {...common} />
            ) : view === "usage" ? (
              <Usage {...common} />
            ) : selected ? (
              <FindingThread
                key={selected.key}
                draft={threadDrafts[selected.key] || ""}
                setDraft={(value) =>
                  setThreadDrafts((current) => ({
                    ...current,
                    [selected.key]: value,
                  }))
                }
                {...common}
                alert={
                  data.alerts.find((a) => a.key === selected.key) || selected
                }
                back={() => setSelected(null)}
                open={openSource}
              />
            ) : tab === "for-you" ? (
              <Inbox
                {...common}
                active={active}
                inbox={inbox}
                setInbox={setInbox}
                issue={issue}
                select={openFinding}
                open={openSource}
              />
            ) : (
              <Chat
                {...common}
                chatId={chatId}
                setChatId={setChatId}
                draft={draft}
                setDraft={setDraft}
                attachment={attachment}
                setAttachment={setAttachment}
                setError={setError}
                settings={settings}
                newChat={newChat}
                select={openFinding}
              />
            )}
          </TabsContent>
        </Tabs>
        <footer>
          <Button
            className="watch-status"
            aria-label="Source health"
            title={`${status}. Last content report: ${reportDate(freshness.latest?.checkedAt)}${issue ? ". Coverage needs attention." : ""}`}
            appearance="subtle"
            icon={
              <IconCircle
                filled
                size={8}
                className={
                  data.settings.paused ||
                  issue ||
                  !sources.length ||
                  !data.runtime?.emailMonitor?.enabled ||
                  data.runtime?.emailMonitor?.error
                    ? "neutral"
                    : "green"
                }
              />
            }
            onClick={() => setView("health")}
          >
            <span>
              {data.demo
                ? "Sample data"
                : data.settings.paused
                  ? "Monitoring paused"
                  : data.runtime?.emailMonitor?.enabled
                    ? data.runtime.emailMonitor.error
                      ? "Email checks need attention"
                      : data.runtime.emailMonitor.running
                        ? "Checking email…"
                        : data.runtime.emailMonitor.lastSuccess
                          ? `Email checked ${reportDate(data.runtime.emailMonitor.lastSuccess)}`
                          : "First email check pending"
                    : "Automatic email checks off"}
            </span>
          </Button>
          <Button
            appearance="subtle"
            className="desk-link"
            onClick={openDesk}
            disabled={deskOpening}
          >
            {deskOpening
              ? "Opening desk…"
              : desk
                ? "Back to companion"
                : "Open your desk"}
          </Button>
        </footer>
      </section>
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent
          className="history-drawer"
          size="sm"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            historyTrigger.current?.focus();
          }}
        >
          <DialogHeader description="Saved on this Mac. Switch conversations without losing your place.">
            Chat history
          </DialogHeader>
          <DialogBody>
            <History
              {...common}
              chatId={chatId}
              openChat={openChat}
              newChat={newChat}
            />
          </DialogBody>
          <DialogFooter>
            <DialogClose>Close history</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!openLink}
        onOpenChange={(open) => {
          if (!open) setOpenLink(null);
        }}
      >
        <DialogContent
          size="sm"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            linkTrigger.current?.focus();
          }}
        >
          <DialogHeader description="This link came from a report.">
            Open this link?
          </DialogHeader>
          <DialogBody>
            <code>{openLink}</code>
          </DialogBody>
          <DialogFooter>
            <DialogClose>Cancel</DialogClose>
            <Button
              appearance="primary"
              asChild
              icon={<IconArrowUpRightFromSquare />}
              iconPosition="end"
            >
              <a
                href={openLink || undefined}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpenLink(null)}
              >
                Open in browser
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
