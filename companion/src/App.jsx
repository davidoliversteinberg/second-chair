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
import { Chat, Inbox, Detail, Settings, Health, History } from "./Views.jsx";
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
  const [openLink, setOpenLink] = useState(null);
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
    fetch("/api/state")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((state) => {
        if (!alive) return;
        token.current = state.token;
        setData(state);
        if (!initialized.current) {
          setChatId(state.chats[0]?.id || null);
          if (!state.demo) setTab("for-you");
          initialized.current = true;
        }
      })
      .catch(
        () =>
          alive &&
          setError(
            "The companion is unavailable. Start it, then reload this page.",
          ),
      );
    const events = new EventSource("/api/events");
    events.onmessage = (e) => {
      if (alive) setData(JSON.parse(e.data));
    };
    events.onerror = () => {
      if (alive) setError("Connection interrupted. Trying to reconnect…");
    };
    events.onopen = () => {
      if (alive) setError("");
    };
    return () => {
      alive = false;
      events.close();
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
      if (!response.ok)
        throw new Error(result.error || "That action could not be completed");
      return result;
    } catch (e) {
      setError(e.message);
      return null;
    }
  }
  const openChat = (id) => {
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
          <p>{error || "Opening your desk…"}</p>
          {error && (
            <Button onClick={() => location.reload()}>Try again</Button>
          )}
        </section>
      </main>
    );
  const active = data.alerts.filter((a) => a.state !== "resolved");
  const sources = Object.entries(data.sources);
  const issue =
    data.problems.length > 0 ||
    sources.some(
      ([, s]) =>
        s.status !== "ok" || Date.now() - Date.parse(s.checkedAt) > 86400000,
    );
  const status = data.settings.paused
    ? "Watching paused"
    : issue
      ? "Check source health"
      : !sources.length
        ? "Waiting for your first report"
        : data.demo
          ? `Watching ${new Set(active.map((a) => a.project)).size} projects`
          : `Watching ${sources.length} report ${sources.length === 1 ? "feed" : "feeds"}`;
  const common = { data, action, setView };
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
          <BrandMark size={43} />
          <div className="brand">
            <div className="brand-line">
              <Heading level="2" asChild>
                <h1>Second Chair</h1>
              </Heading>
              <span className="badge">
                {data.demo ? "Sample preview" : "Local companion"}
              </span>
            </div>
            <p>Keeping an eye on things</p>
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
            ) : view === "history" ? (
              <History {...common} openChat={openChat} newChat={newChat} />
            ) : selected ? (
              <Detail
                {...common}
                alert={selected}
                back={() => setSelected(null)}
                open={openSource}
                discuss={() => {
                  newChat();
                  setDraft(`Help me with this finding: ${selected.title}`);
                }}
              />
            ) : tab === "for-you" ? (
              <Inbox
                {...common}
                active={active}
                issue={issue}
                select={setSelected}
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
                select={setSelected}
              />
            )}
          </TabsContent>
        </Tabs>
        <footer>
          <Button
            className="watch-status"
            appearance="subtle"
            icon={
              <IconCircle
                filled
                size={8}
                className={
                  data.settings.paused || issue || !sources.length
                    ? "neutral"
                    : "green"
                }
              />
            }
            onClick={() => setView("health")}
          >
            <span>
              {status}
              <small>
                {data.demo
                  ? "Sample reports"
                  : `Folder checked ${time(data.lastPoll)}`}
              </small>
            </span>
          </Button>
          <Button
            appearance="subtle"
            className="desk-link"
            onClick={() => {
              if (native) window.open(location.origin + "/?desk=1", "_blank");
              else setDesk(!desk);
            }}
          >
            {desk ? "Back to companion" : "Open your desk"}
          </Button>
        </footer>
      </section>
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
            Open this source?
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
