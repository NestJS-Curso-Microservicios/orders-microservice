import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { envs } from './config';

async function bootstrap() {
	const logger = new Logger('Bootstrap-Orders');
	const app = await NestFactory.createMicroservice<MicroserviceOptions>(
		AppModule,
		{
			transport: Transport.NATS,
			options: {
				servers: envs.natsServers,
			},
		}
	);
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
		})
	);
	await app.listen().then(() => {
		logger.log(
			`Orders Microservice is running on http://localhost:${envs.port}`
		);
	});
}

bootstrap().then(() => console.log('Orders Microservice is running'));
