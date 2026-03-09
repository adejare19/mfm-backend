const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'church-media';

/**
 * GET /api/events
 * Public — returns all events ordered by event_date ascending (upcoming first)
 */
const getEvents = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true });

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[EVENTS] Get error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch events.' });
  }
};

/**
 * POST /api/events
 * Admin only
 */
const createEvent = async (req, res) => {
  try {
    const { title, description, event_date, location, time } = req.body;

    if (!title || !event_date) {
      return res.status(400).json({ success: false, message: 'Title and event date are required.' });
    }

    let flyerUrl = null;

    // Upload flyer image to Supabase Storage
    if (req.files && req.files.length > 0) {
      const file = req.files[0]; // events typically have one flyer
      const ext = path.extname(file.originalname);
      const fileName = `events/${uuidv4()}${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(fileName);

      flyerUrl = urlData.publicUrl;
    }

    const { data, error } = await supabase
      .from('events')
      .insert([{
        title,
        description: description || null,
        event_date,
        location: location || null,
        time: time || null,
        flyer_url: flyerUrl,
        uploaded_by: req.admin.id,
      }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, message: 'Event created successfully.', data });
  } catch (err) {
    console.error('[EVENTS] Create error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to create event.' });
  }
};

/**
 * DELETE /api/events/:id
 * Admin only
 */
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('flyer_url')
      .eq('id', id)
      .single();

    if (fetchError || !event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // Clean up storage
    if (event.flyer_url) {
      const url = new URL(event.flyer_url);
      const filePath = url.pathname.split(`/${BUCKET}/`)[1];
      await supabase.storage.from(BUCKET).remove([filePath]);
    }

    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Event deleted successfully.' });
  } catch (err) {
    console.error('[EVENTS] Delete error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to delete event.' });
  }
};

module.exports = { getEvents, createEvent, deleteEvent };
