import { Router, type IRouter } from "express";
import healthRouter from "./health";
import shopRouter from "./shop";
import catalogRouter from "./catalog";
import pricingRouter from "./pricing";
import ordersRouter from "./orders";
import reviewsRouter from "./reviews";
import storageRouter from "./storage";
import openaiRouter from "./openai";
import adminRouter from "./admin";
import generateRouter from "./generate";

const router: IRouter = Router();

router.use(healthRouter);
router.use(shopRouter);
router.use(catalogRouter);
router.use(pricingRouter);
router.use(ordersRouter);
router.use(reviewsRouter);
router.use(storageRouter);
router.use(openaiRouter);
router.use(adminRouter);
router.use(generateRouter);

export default router;
