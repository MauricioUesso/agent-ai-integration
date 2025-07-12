import OpenAI from 'openai';
import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

// Configurações
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'SUA_KEY_OPENAI'; // Substitua pela chave OpenAI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'SUA_KEY_GEMINI'; // Substitua pela chave Gemini
const FILE_PATH = './sensores_simulados.csv';

// Inicializa OpenAI SDK
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

// Função para ler o CSV
function readCsvAsText(path) {
    if (!fs.existsSync(path)) throw new Error('Arquivo CSV não encontrado!');
    return fs.readFileSync(path, 'utf-8');
}

// Função para salvar a resposta em um arquivo
function salvarResposta(texto, origem = 'openai', pasta = 'report') {
    if (!fs.existsSync(pasta)) {
        fs.mkdirSync(pasta, { recursive: true });
    }

    const nomeArquivo = `${pasta}/resposta_${origem}.txt`;
    fs.writeFileSync(nomeArquivo, texto, 'utf-8');
    console.log(`\n💾 Resposta salva em: ${nomeArquivo}`);
}

// Prompt do usuário
const prompt = 'Tendo em mente que o CSV contém dados de sensores simulados e eu sou responsável pela energia do prédio, gere analise sobre os dados e forneça insights ou recomendações com base neles de forma simplificada, eu gostaria de uma analise voltada para o conceito de ESG.';
const csvText = readCsvAsText(FILE_PATH);

// Requisição com OpenAI SDK
async function callOpenAI(prompt, csvText) {
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: `${prompt}\n\nDados do CSV:\n\n${csvText}`
                }
            ]
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('❌ Erro na OpenAI:', error.message || error);
        throw error;
    }
}

// Requisição com Gemini (fallback)
async function callGemini(prompt, csvText) {
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        parts: [
                            { text: `${prompt}\n\nDados do CSV:\n\n${csvText}` }
                        ]
                    }
                ]
            },
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );

        return response.data.candidates?.[0]?.content?.parts?.[0]?.text || '[Sem resposta]';
    } catch (error) {
        console.error('❌ Erro na Gemini:', error.response?.data || error.message);
        throw error;
    }
}

// Execução principal
(async () => {
    try {
        const resposta = await callOpenAI(prompt, csvText);
        console.log('\n✅ Resposta da OpenAI:\n');
        salvarResposta(resposta, 'openai');
        console.log(resposta);

    } catch (_) {
        console.log('\n🔁 Tentando Gemini como fallback...');
        try {
            const fallback = await callGemini(prompt, csvText);
            console.log('\n✅ Resposta da Gemini:\n');
            salvarResposta(fallback, 'gemini');
            console.log(fallback);
        } catch (err) {
            console.error('\n❌ Nenhuma das APIs respondeu com sucesso.');
        }
    }
})();
