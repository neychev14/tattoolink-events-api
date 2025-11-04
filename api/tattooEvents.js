import Parser from "rss-parser";

export default async function handler(req, res) {
  try {
    const parser = new Parser();
    const CORS_PROXY = "https://api.allorigins.win/raw?url=";
    const RSS_URL = "https://www.worldtattooevents.com/feed/";

    // Четем RSS чрез proxy
    const feed = await parser.parseURL(${CORS_PROXY}${encodeURIComponent(RSS_URL)});

    // Филтрираме само бъдещи или актуални събития
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
        description: item.contentSnippet || item.content || "",
      }));

    res.status(200).json(upcomingEvents);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch tattoo events" });
  }
}
