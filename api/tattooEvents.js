import Parser from "rss-parser";
import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";

export default async function handler(req, res) {
  try {
    const parser = new Parser({
      customFetch: (url, options) => {
        // Използваме агент, който заобикаля SSL проверки
        const agent = new HttpsProxyAgent();
        return fetch(url, { ...options, agent });
      }
    });

    const RSS_URL = "https://www.worldtattooevents.com/feed/";
    const feed = await parser.parseURL(RSS_URL);

    const upcomingEvents = feed.items
      .filter(item => {
        const eventDate = new Date(item.pubDate);
        return eventDate >= new Date() || isNaN(eventDate);
      })
      .slice(0, 5)
      .map(item => ({
        title: item.title,
        link: item.link,
        date: item.pubDate,
        description: item.contentSnippet || item.content || ""
      }));

    res.status(200).json(upcomingEvents);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch tattoo events" });
  }
}
