import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const response = await fetch('https://www.worldtattooevents.com/wp-json/wp/v2/events?per_page=10&_fields=title,link,date,acf,content');
    const data = await response.json();

    // Взимаме само бъдещи (предстоящи) събития
    const upcomingEvents = data
      .filter(event => new Date(event.date) > new Date())
      .slice(0, 5);

    res.status(200).json(upcomingEvents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch tattoo events' });
  }
}
