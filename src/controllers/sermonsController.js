const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'church-media';

/**
 * GET /api/sermons
 * Public — returns all sermons ordered by date descending
 */
const getSermons = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sermons')
      .select('*')
      .order('sermon_date', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[SERMONS] Get error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch sermons.' });
  }
};

/**
 * POST /api/sermons
 * Admin only — upload a new sermon with optional media files
 */
const createSermon = async (req, res) => {
  try {
    const { title, description, preacher, sermon_date, series } = req.body;

    if (!title || !sermon_date) {
      return res.status(400).json({ success: false, message: 'Title and date are required.' });
    }

    let fileUrls = [];

    // Upload each file to Supabase Storage
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const ext = path.extname(file.originalname);
        const fileName = `sermons/${uuidv4()}${ext}`;

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

        fileUrls.push({ name: file.originalname, url: urlData.publicUrl, type: file.mimetype });
      }
    }

    const { data, error } = await supabase
      .from('sermons')
      .insert([{
        title,
        description: description || null,
        preacher: preacher || null,
        sermon_date,
        series: series || null,
        files: fileUrls,
        uploaded_by: req.admin.id,
      }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, message: 'Sermon uploaded successfully.', data });
  } catch (err) {
    console.error('[SERMONS] Create error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to upload sermon.' });
  }
};

/**
 * DELETE /api/sermons/:id
 * Admin only
 */
const deleteSermon = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch sermon to get file paths for storage cleanup
    const { data: sermon, error: fetchError } = await supabase
      .from('sermons')
      .select('files')
      .eq('id', id)
      .single();

    if (fetchError || !sermon) {
      return res.status(404).json({ success: false, message: 'Sermon not found.' });
    }

    // Delete files from Supabase Storage
    if (sermon.files && sermon.files.length > 0) {
      const filePaths = sermon.files.map(f => {
        const url = new URL(f.url);
        return url.pathname.split(`/${BUCKET}/`)[1];
      });
      await supabase.storage.from(BUCKET).remove(filePaths);
    }

    const { error } = await supabase.from('sermons').delete().eq('id', id);
    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Sermon deleted successfully.' });
  } catch (err) {
    console.error('[SERMONS] Delete error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to delete sermon.' });
  }
};

module.exports = { getSermons, createSermon, deleteSermon };
