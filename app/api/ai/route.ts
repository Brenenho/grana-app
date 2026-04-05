import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { reply: "GEMINI_API_KEY não encontrada. Adicione no arquivo .env.local e reinicie o servidor." },
      { status: 200 }
    );
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message, context } = await req.json();

    const genAI = new GoogleGenerativeAI(apiKey);

    const systemInstruction = `Você é um assistente financeiro pessoal brasileiro chamado Grana.
Você é especialista nos conceitos de:
- Ramit Sethi (I Will Teach You to Be Rich): Conscious Spending Plan com 4 baldes (Custos Fixos 50%, Reserva 10%, Caixa Empreendedor 15%, Gastos Livres 25%)
- Morgan Housel (The Psychology of Money): comportamento financeiro, padrões de gasto invisíveis, projeções de longo prazo
- Robert Kiyosaki (Pai Rico, Pai Pobre): pague a si mesmo primeiro, caixa empreendedor como ativo

Contexto atual do usuário:
- Salário mensal: R$ ${context.salary.toLocaleString("pt-BR")}
- Total gasto este mês: R$ ${Math.round(context.totalSpent).toLocaleString("pt-BR")}
- Transações este mês: ${context.transactionsCount}
- Metas: ${context.goals.map((g: { name: string; current: number; target: number }) => `${g.name}: R$${Math.round(g.current).toLocaleString("pt-BR")} de R$${g.target.toLocaleString("pt-BR")}`).join(", ") || "nenhuma"}
- Wishlist: ${context.wishlist.map((w: { name: string; price: number }) => `${w.name} (R$${w.price.toLocaleString("pt-BR")})`).join(", ") || "vazia"}
- Top categorias de gasto: ${context.topCategories.map(([c, v]: [string, number]) => `${c}: R$${Math.round(v).toLocaleString("pt-BR")}`).join(", ") || "sem dados"}

Responda de forma direta, amigável e em português brasileiro informal.
Seja conciso (máximo 3-4 parágrafos).
Use os dados reais do usuário nas respostas.
Quando relevante, cite conceitos dos livros de forma natural (não forçada).
Se o usuário disser que gastou algo, diga o impacto no balde correspondente.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction,
    });

    const result = await model.generateContent(message);
    const reply = result.response.text();

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error("[Gemini error]", error);

    let errorMsg = "Erro desconhecido ao chamar a API Gemini.";
    if (error instanceof Error) errorMsg = error.message;
    else if (typeof error === "string") errorMsg = error;

    if (errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("invalid API key")) {
      return NextResponse.json({
        reply: "❌ A GEMINI_API_KEY está inválida. Gere uma nova em aistudio.google.com e atualize o .env.local.",
      });
    }
    if (errorMsg.includes("spending cap") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("429")) {
      return NextResponse.json({
        reply: "⚠️ Limite de uso atingido na API Gemini. Acesse aistudio.google.com e verifique o spending cap do seu projeto.",
      });
    }
    if (errorMsg.includes("PERMISSION_DENIED") || errorMsg.includes("403")) {
      return NextResponse.json({
        reply: "❌ Permissão negada pela API Gemini. Verifique se a chave tem acesso ao modelo gemini-2.0-flash.",
      });
    }
    if (errorMsg.includes("not found") || errorMsg.includes("404")) {
      return NextResponse.json({
        reply: "❌ Modelo não encontrado. Verifique o nome do modelo no arquivo api/ai/route.ts.",
      });
    }

    return NextResponse.json({
      reply: `❌ Erro ao conectar com a IA: ${errorMsg}`,
    });
  }
}
