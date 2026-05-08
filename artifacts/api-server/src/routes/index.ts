import { Router, type IRouter } from "express";
import healthRouter from "./health";
import notificationsRouter from "./notifications";
import candyRouter from "./candy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(notificationsRouter);
router.use(candyRouter);

export default router;
