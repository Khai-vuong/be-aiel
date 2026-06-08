// // ai.controller.ts
// import { Controller, Post, Body, Sse, Res } from '@nestjs/common';
// import { Response } from 'express';

// @Controller('ai')
// export class AiController {
//   constructor(private readonly aiService: AiService) {}

//   @Post('analyze')
//   async analyzeWithStream(@Body() dto: AnalyzeDto, @Res() res: Response) {
//     res.setHeader('Content-Type', 'text/event-stream');
//     res.setHeader('Cache-Control', 'no-cache');
//     res.setHeader('Connection', 'keep-alive');

//     const emit = (step: string, detail?: string) => {
//       res.write(`data: ${JSON.stringify({ step, detail })}\n\n`);
//     };

//     emit('reading_file', 'Đang tải file lên Gemini...');
//     const fileContent = await this.aiService.uploadFile(dto.fileUrl);

//     emit('thinking', 'Agent đang phân tích nội dung...');
//     // ReAct loop
//     for await (const action of this.aiService.reactLoop(fileContent, dto.query)) {
//       emit(action.type, action.description); 
//       // ví dụ: { type: 'tool_call', description: 'Tìm kiếm trong tài liệu...' }
//     }

//     emit('done', 'Hoàn thành');
//     res.end();
//   }
// }