import express from 'express';
import path from 'path';
import fs from 'fs';
import {debug} from '../app';
import {app} from '../app';

const router = express.Router();

router.post('/api/putSuperObject/init', async (req, res) => {
  const client = res.locals.client;

  try {
    const {bucketName, objectName, data, partConcurrency} = req.body;
    const payload = {
      bucketName,
      objectName,
      data,
      partConcurrency
    };

    app.locals.SuperUpload = client.putSuperObject(payload);

    return res.status(200).json({
      message: '分片任务创建成功',
      data: payload
    });
  } catch (error: any) {
    debug(error);
    return res.status(error.status_code || 500).json({...error});
  }
});

router.get('/api/putSuperObject/getInstance', async (req, res) => {
  try {
    const SuperUpload = app.locals.SuperUpload;

    console.log(SuperUpload);

    return res.status(200).json({
      message: SuperUpload ? '分片任务查询成功' : '分片任务不存在',
      data: SuperUpload ? true : false
    });
  } catch (error: any) {
    debug(error);
    return res.status(error.status_code || 500).json({...error});
  }
});

router.post('/api/putSuperObject/start', async (req, res) => {
  try {
    const SuperUpload = app.locals.SuperUpload;
    const tasks = await SuperUpload.start();

    return res.status(200).json({
      message: '分片任务启动成功',
      data: tasks
    });
  } catch (error: any) {
    debug(error);
    return res.status(error.status_code || 500).json({...error});
  }
});

router.post('/api/putSuperObject/pause', async (req, res) => {
  try {
    const SuperUpload = app.locals.SuperUpload;
    let result = false;

    if (SuperUpload) {
      result = SuperUpload.pause();
    }

    return res.status(200).json({
      message: result ? '暂停成功' : '暂停失败',
      data: null
    });
  } catch (error: any) {
    debug(error);
    return res.status(error.status_code || 500).json({...error});
  }
});

router.post('/api/putSuperObject/resume', async (req, res) => {
  try {
    const SuperUpload = app.locals.SuperUpload;
    let result = false;

    if (SuperUpload) {
      result = SuperUpload.resume();
    }

    return res.status(200).json({
      message: result ? '恢复成功' : '恢复失败',
      data: null
    });
  } catch (error: any) {
    debug(error);
    return res.status(error.status_code || 500).json({...error});
  }
});

router.post('/api/putSuperObject/cancel', async (req, res) => {
  try {
    const SuperUpload = app.locals.SuperUpload;
    let result = false;

    if (SuperUpload) {
      result = await SuperUpload.cancel();
    }

    return res.status(200).json({
      message: result ? '取消成功' : '取消失败',
      data: null
    });
  } catch (error: any) {
    debug(error);
    return res.status(error.status_code || 500).json({...error});
  }
});

export default router;
