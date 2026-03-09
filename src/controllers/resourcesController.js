const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'church-media';

/**
 * GET /api/resources
 * Public
 */
const getResources = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[RESOURCES] Get error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch resources.' });
  }
};

/**
 * POST /api/resources
 * Admin only — prayer booklets, study materials, activities
 */
const createResource = async (req, res) => {
  try {
    const { title, description, category } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }

    let fileUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const ext = path.extname(file.originalname);
        const fileName = `resources/${uuidv4()}${ext}`;

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
      .from('resources')
      .insert([{
        title,
        description: description || null,
        category: category || 'general',
        files: fileUrls,
        uploaded_by: req.admin.id,
      }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, message: 'Resource uploaded successfully.', data });
  } catch (err) {
    console.error('[RESOURCES] Create error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to upload resource.' });
  }
};

/**
 * DELETE /api/resources/:id
 * Admin only
 */
const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: resource, error: fetchError } = await supabase
      .from('resources')
      .select('files')
      .eq('id', id)
      .single();

    if (fetchError || !resource) {
      return res.status(404).json({ success: false, message: 'Resource not found.' });
    }

    if (resource.files && resource.files.length > 0) {
      const filePaths = resource.files.map(f => {
        const url = new URL(f.url);
        return url.pathname.split(`/${BUCKET}/`)[1];
      });
      await supabase.storage.from(BUCKET).remove(filePaths);
    }

    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Resource deleted successfully.' });
  } catch (err) {
    console.error('[RESOURCES] Delete error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to delete resource.' });
  }
};

module.exports = { getResources, createResource, deleteResource };
