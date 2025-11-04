import Parser from "rss-parser";

export default async function handler(req, res) {
  try {
    const parser = new Parser();

    // Използваме публичен proxy, който позволява заявката
    const RSS_URL =
      "https://api.allorigins.win/raw?url=https://www.worldtattooevents.com/feed/";

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
