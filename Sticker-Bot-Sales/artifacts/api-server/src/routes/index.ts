import { Router, type IRouter } from "express";
import healthRouter from "./health";
import shopRouter from "./shop";
import catalogRouter from "./catalog";
import pricingRouter from "./pricing";
import ordersRouter from "./orders";
import reviewsRouter from "./reviews";
import storageRouter from "./storage";
import adminRouter from "./admin";
import authRouter from "./auth";
import paymentsRouter from "./payments";
import whatsappRouter from "./whatsapp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(paymentsRouter);
router.use(whatsappRouter);
router.use(shopRouter);
router.use(catalogRouter);
router.use(pricingRouter);
router.use(ordersRouter);
router.use(reviewsRouter);
router.use(storageRouter);
router.use(adminRouter);

export default router;
