import * as firebase from 'firebase-admin';
import { BadRequestException, Injectable } from '@nestjs/common';
import * as moment from 'moment-timezone';
import { NotificationDto } from './dto/create-notification.dto';
import { CommonService } from 'src/common/common.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly commonService: CommonService,
    private httpService: HttpService,
  ) {}
  async notify(notificationDto: NotificationDto) {
    if (!notificationDto.deviceToken && !notificationDto.deviceTokens) {
      throw new BadRequestException('Device token is required');
    }
    if (notificationDto.deviceToken && notificationDto.deviceTokens) {
      throw new BadRequestException(
        'Device token and device tokens cannot be used together',
      );
    }
    try {
      let body: any;
      if (notificationDto.deviceToken) {
        body = {
          notification: {
            title: notificationDto.title,
            body: notificationDto.message,
            imageUrl: notificationDto.urlImage,
          },
          token: notificationDto.deviceToken,
          //topic: 'all_users',
          data: {},
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'default',
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            },
          },
          apns: {
            headers: {
              'apns-priority': '10',
            },
            payload: {
              aps: {
                contentAvailable: true,
                sound: 'default',
                badge: 1,
              },
            },
          },
        };
        await firebase
          .messaging()
          .send({
            ...body,
            android: {
              ...body.android,
              priority: 'high',
            },
          })
          .catch((error: any) => {
            console.error(error);
          });
      } else {
        const chunks = this.chunkArray(notificationDto.deviceTokens, 500);
        const results = await Promise.all(
          chunks.map((tokenChunk) =>
            firebase.messaging().sendEachForMulticast({
              tokens: tokenChunk,
              notification: {
                title: notificationDto.title,
                body: notificationDto.message,
                imageUrl: notificationDto.urlImage,
              },
              android: {
                priority: 'high',
                notification: {
                  sound: 'default',
                  channelId: 'default',
                  clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                },
              },
              apns: {
                headers: {
                  'apns-priority': '10',
                },
                payload: {
                  aps: {
                    contentAvailable: true,
                    sound: 'default',
                  },
                },
              },
            }),
          ),
        );

        return results;
      }
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  async sendNotify(notificationDto: NotificationDto) {
    try {
      let body: any;

      const condition = notificationDto.topics
        .map((topic) => `'${topic}' in topics`)
        .join(' || ');

      body = {
        notification: {
          title: notificationDto.title,
          body: notificationDto.message,
          imageUrl: notificationDto.urlImage,
        },
        condition,
        //token: notificationDto.deviceToken,
        //topic: notificationDto.topics.length > 1 ? notificationDto.topics[0] : undefined,
        data: {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              contentAvailable: true,
              sound: 'default',
              badge: 1,
            },
          },
        },
      };
      await firebase
        .messaging()
        .send({
          ...body,
          android: {
            ...body.android,
            priority: 'high',
          },
        })
        .catch((error: any) => {
          console.error(error);
        });
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  private chunkArray(array: string[], size: number): string[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  @Cron('* * * * *')
  async handelCronPrograminNotifications() {
    try {
      // Obtener la hora actual en Lima, Perú
      const actualTime = moment().tz('America/Lima').format('HH:mm');

      const notifyList = await firstValueFrom(
        this.httpService.get(
          `${process.env.CALIDDA_API_URL}/Notificacion/listar`,
          {
            headers: {
              access_token: process.env.CALIDDA_ACCESS_TOKEN,
            },
          },
        ),
      );

      if (notifyList?.data?.data?.length === 0) {
        return;
      }

      for (const notification of notifyList.data.data) {
        if (notification?.Hora === `${actualTime}:00`) {
          const body = {
            notification: {
              title: notification?.titulo,
              body: notification?.Descripcion,
            },
            topic: notification?.codigoOsinergmin
              ? notification?.codigoOsinergmin
              : 'all',
            data: {},
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                channelId: 'default',
                clickAction: 'FLUTTER_NOTIFICATION_CLICK',
              },
            },
            apns: {
              headers: {
                'apns-priority': '10',
              },
              payload: {
                aps: {
                  contentAvailable: true,
                  sound: 'default',
                  badge: 1,
                },
              },
            },
          };

          try {
            await firebase.messaging().send({
              ...body,
              android: {
                ...body.android,
                priority: 'high',
              },
            });
            await firstValueFrom(
              this.httpService.post(
                `${process.env.CALIDDA_API_URL}/Notificacion/enviado`,
                {
                  ids: [notification.Id],
                },
                {
                  headers: {
                    access_token: process.env.CALIDDA_ACCESS_TOKEN,
                  },
                },
              ),
            );
          } catch (error) {
            console.error(error);
          }
        }
      }

      return {
        message: 'Notificaciones enviadas',
      };
    } catch (error) {
      console.log(error);
    }
  }
}
