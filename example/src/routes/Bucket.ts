import express from 'express';
const router = express.Router();

router.get('/api/listBuckets', async (req, res) => {
  const client = res.locals.client;

  try {
    const response = await client.listBuckets();

    return res.status(200).json({...response});
  } catch (error: any) {
    return res.status(error.status_code || 500).json({...error});
  }
});

router.put('/api/createBucket', async (req, res) => {
  const client = res.locals.client;
  const {bucketName, enableMultiAZ} = req.body;

  try {
    const response = await client.createBucket(bucketName, {body: {enableMultiAZ: !!enableMultiAZ}});

    return res.status(200).json({...response});
  } catch (error: any) {
    return res.status(error.status_code || 500).json({...error});
  }
});

export default router;
