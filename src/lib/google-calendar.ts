const SCOPES = "https://www.googleapis.com/auth/calendar.events";
const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";

let tokenClient: any = null;

export async function initGoogleCalendar(clientId: string): Promise<void> {
  await loadScript("https://apis.google.com/js/api.js");
  await loadScript("https://accounts.google.com/gsi/client");

  await new Promise<void>((resolve) => {
    (window as any).gapi.load("client", async () => {
      await (window as any).gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
      resolve();
    });
  });

  tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: () => {},
  });
}

export function requestAccessToken(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) { reject(new Error("Google Calendar not initialized")); return; }
    tokenClient.callback = (response: any) => {
      if (response.error) reject(new Error(response.error));
      else resolve(response);
    };
    tokenClient.requestAccessToken();
  });
}

export async function createCalendarEvent(job: {
  title: string; description: string; startTime: string; endTime: string; location: string;
}): Promise<string> {
  const response = await (window as any).gapi.client.calendar.events.insert({
    calendarId: "primary",
    resource: {
      summary: job.title, description: job.description, location: job.location,
      start: { dateTime: job.startTime }, end: { dateTime: job.endTime },
    },
  });
  return response.result.id;
}

export async function updateCalendarEvent(eventId: string, job: {
  title: string; description: string; startTime: string; endTime: string; location: string;
}): Promise<void> {
  await (window as any).gapi.client.calendar.events.update({
    calendarId: "primary", eventId,
    resource: {
      summary: job.title, description: job.description, location: job.location,
      start: { dateTime: job.startTime }, end: { dateTime: job.endTime },
    },
  });
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  await (window as any).gapi.client.calendar.events.delete({ calendarId: "primary", eventId });
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
