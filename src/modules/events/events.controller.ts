import { Request, Response } from "express";
import { eventService } from "@/modules/events/events.service";

export function streamEvents(req: Request, res: Response): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  const unsubscribe = eventService.subscribe((message) => {
    res.write(`data: ${message}\n\n`);
  });

  const heartbeat = setInterval(() => res.write(": ping\n\n"), 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}
