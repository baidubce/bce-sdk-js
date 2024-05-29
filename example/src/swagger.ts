import path from 'path';

import rootPackage from '../../package.json';
import {PORT} from './config';

export default {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'BosClient OpenAPI',
      version: rootPackage.version,
      description: '百度对象存储BOS(Baidu Object Storage) OpenAPI调试文档，该文档仅用于调试`@baidcloud/sdk`项目',
      license: {
        name: rootPackage.license,
        url: 'https://mit-license.org/'
      }
    },
    externalDocs: {
      description: '官方文档',
      url: 'https://cloud.baidu.com/doc/BOS/s/Rjwvysdnp'
    },
    // schemes: ['http', 'https'],
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      }
    ],
    paths: {
      '/api/listBuckets': {
        get: {
          summary: '列举请求者拥有的所有bucket',
          tags: ['Bucket'],
          responses: {
            '200': {
              description: 'The list of the buckets',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      http_headers: {
                        $ref: '#/components/schemas/http_headers'
                      },
                      body: {
                        type: 'object',
                        properties: {
                          owner: {
                            $ref: '#/components/schemas/owner'
                          },
                          buckets: {
                            type: 'array',
                            xml: {
                              name: 'buckets',
                              wrapped: true
                            },
                            items: {
                              $ref: '#/components/schemas/bucket'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/createBucket': {
        put: {
          summary: '创建Bucket',
          description:
            '每一个用户只允许创建100个Bucket。创建的Bucket其权限默认为private，即Bucket Owner获得FULL_CONTROL，其他人没有任何权限',
          tags: ['Bucket'],
          requestBody: {
            description: '指定创建的Bucket中数据是否多AZ分布, 目前仅支持北京和广州两个region',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    bucketName: {
                      $ref: '#/components/schemas/bucketName'
                    },
                    enableMultiAZ: {
                      type: 'boolean',
                      example: true
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Bucket创建成功'
            },
            400: {
              description: '若一个用户创建的Bucket超过100个，服务将返回400 Bad Request，错误码TooManyBuckets'
            },
            409: {
              description:
                '若请求的Bucket已存在，无论该Bucket是否是请求者创建，都会返回409 Conflict，错误信息：BucketAlreadyExists'
            }
          }
        }
      }
    },
    components: {
      schemas: {
        bucketName: {
          type: 'string',
          example: 'bucket001'
        },
        http_headers: {
          type: 'object',
          properties: {
            'date': {type: 'string', example: 'Wed, 18 Jan 2023 09:28:10 GMT'},
            'content-type': {type: 'string', example: 'application/json; charset=utf-8'},
            'content-length': {type: 'string', example: '729'},
            'connection': {type: 'string', example: 'close'},
            'server': {type: 'string', example: 'BceBos'},
            'x-bce-debug-id': {
              type: 'string',
              example: '688BnmzdiSUoZg80tyeA6t7U90dI+VYXXDKifjKxEGXEPz4QcHvwKXzoVisVputFzP93U3we8GPOwWAFzpBflw=='
            },
            'x-bce-request-id': {type: 'string', example: '9250093d-9f25-4ccf-a120-2002d30d954c'}
          }
        },
        owner: {
          type: 'object',
          properties: {
            id: {type: 'string', example: 'b3e4fc564bda42d98318c47c66396fd8'},
            displayName: {type: 'string', example: 'PASSPORT:160104063'}
          }
        },
        bucket: {
          type: 'object',
          properties: {
            name: {type: 'string', example: 'bucket1'},
            location: {type: 'string', example: 'bj', enum: ['bj', 'su', 'gz']},
            creationDate: {type: 'string', format: 'date-time', example: '2022-12-06T03:20:14Z'},
            enableMultiAz: {type: 'boolean', example: true}
          }
        }
      },
      requestBodies: {}
    }
  },
  apis: [path.join(__dirname, './routes/*.ts')]
};
