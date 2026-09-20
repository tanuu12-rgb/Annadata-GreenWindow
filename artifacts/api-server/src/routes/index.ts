import { Router, type IRouter } from "express";
import healthRouter from "./health";
import greenwindowRouter from "./greenwindow";

const router: IRouter = Router();

router.use(healthRouter);
router.use(greenwindowRouter);

export default router;
