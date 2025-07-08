import React, { useState, useRef } from 'react';
import { Camera, Upload, Scan, CheckCircle, X, Eye } from 'lucide-react';
import { DatabaseService } from '../../lib/database';
import { AuthService } from '../../lib/auth';
import { formatCurrency } from '../../lib/utils';

interface ReciboParsed {
  descricao: string;
  valor: number;
  data: string;
  estabelecimento?: string;
  categoria_sugerida?: string;
  confianca: number;
}

export function OCRRecibos() {
  const [loading, setLoading] = useState(false);
  const [recibosParsed, setRecibosParsed] = useState<ReciboParsed[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  React.useEffect(() => {
    loadData();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const loadData = async () => {
    try {
      const [categoriasData, contasData] = await Promise.all([
        DatabaseService.getCategorias(),
        DatabaseService.getContas()
      ]);
      setCategorias(categoriasData.filter(c => c.tipo === 'DESPESA'));
      setContas(contasData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Usar câmera traseira se disponível
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      alert('Erro ao acessar a câmera. Verifique as permissões.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        // Converter para blob e processar
        canvas.toBlob((blob) => {
          if (blob) {
            processImage(blob);
          }
        }, 'image/jpeg', 0.8);
      }
    }
    stopCamera();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    processImage(file);
  };

  const processImage = async (imageFile: Blob) => {
    setLoading(true);

    try {
      // Simular OCR (em produção, usaria uma API real como Google Vision, AWS Textract, etc.)
      const reciboSimulado = await simulateOCR(imageFile);
      setRecibosParsed([reciboSimulado]);
      setShowPreview(true);
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      alert('Erro ao processar a imagem. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const simulateOCR = async (imageFile: Blob): Promise<ReciboParsed> => {
    // Simular processamento OCR
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Dados simulados baseados em padrões comuns de recibos
    const estabelecimentos = [
      'Supermercado Extra', 'Posto Shell', 'Farmácia Drogasil', 
      'Restaurante Outback', 'Shopping Center', 'Loja Magazine Luiza'
    ];
    
    const estabelecimento = estabelecimentos[Math.floor(Math.random() * estabelecimentos.length)];
    const valor = Math.random() * 200 + 10; // Entre R$ 10 e R$ 210
    const data = new Date().toISOString().split('T')[0];
    
    // Sugerir categoria baseada no estabelecimento
    let categoria_sugerida = '';
    if (estabelecimento.includes('Supermercado')) categoria_sugerida = 'Alimentação';
    else if (estabelecimento.includes('Posto')) categoria_sugerida = 'Transporte';
    else if (estabelecimento.includes('Farmácia')) categoria_sugerida = 'Saúde';
    else if (estabelecimento.includes('Restaurante')) categoria_sugerida = 'Alimentação';
    else categoria_sugerida = 'Compras';

    const categoriaEncontrada = categorias.find(c => c.nome === categoria_sugerida);

    return {
      descricao: `Compra em ${estabelecimento}`,
      valor: Math.round(valor * 100) / 100,
      data,
      estabelecimento,
      categoria_sugerida: categoriaEncontrada?.id || '',
      confianca: Math.random() * 30 + 70 // Entre 70% e 100%
    };
  };

  const handleImportRecibos = async () => {
    if (!contaSelecionada) {
      alert('Selecione uma conta para importar os recibos');
      return;
    }

    setLoading(true);

    try {
      for (const recibo of recibosParsed) {
        await DatabaseService.createLancamento({
          conta_id: contaSelecionada,
          categoria_id: recibo.categoria_sugerida || categorias[0]?.id,
          descricao: recibo.descricao,
          valor: recibo.valor,
          data: recibo.data,
          tipo: 'DESPESA',
          status: 'CONFIRMADO',
          observacoes: `Importado via OCR - Estabelecimento: ${recibo.estabelecimento} - Confiança: ${recibo.confianca.toFixed(1)}%`
        });
      }

      alert(`${recibosParsed.length} recibo(s) importado(s) com sucesso!`);
      setRecibosParsed([]);
      setShowPreview(false);
    } catch (error) {
      console.error('Erro ao importar recibos:', error);
      alert('Erro ao importar recibos');
    } finally {
      setLoading(false);
    }
  };

  const updateRecibo = (index: number, updates: Partial<ReciboParsed>) => {
    setRecibosParsed(prev => 
      prev.map((r, i) => i === index ? { ...r, ...updates } : r)
    );
  };

  const getConfiancaColor = (confianca: number) => {
    if (confianca >= 90) return 'text-green-600 bg-green-50';
    if (confianca >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">OCR de Recibos</h1>
        <p className="text-gray-600 mt-2">Digitalize recibos automaticamente usando a câmera ou upload de imagens</p>
      </div>

      {/* Seleção de Conta */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Configurações</h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Conta de Destino *
          </label>
          <select
            value={contaSelecionada}
            onChange={(e) => setContaSelecionada(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione uma conta</option>
            {contas.map(conta => (
              <option key={conta.id} value={conta.id}>
                {conta.nome} - {conta.tipo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Opções de Captura */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Capturar Recibo</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Câmera */}
          <button
            onClick={startCamera}
            disabled={loading || !contaSelecionada || showCamera}
            className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Usar Câmera</h3>
            <p className="text-gray-600 text-center">Fotografe o recibo diretamente</p>
          </button>

          {/* Upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={loading || !contaSelecionada}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || !contaSelecionada}
              className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload de Imagem</h3>
              <p className="text-gray-600 text-center">Selecione uma foto do recibo</p>
            </button>
          </div>
        </div>
      </div>

      {/* Câmera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Capturar Recibo</h2>
                <button
                  onClick={stopCamera}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg mb-4"
              />
              
              <div className="flex space-x-3">
                <button
                  onClick={stopCamera}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={capturePhoto}
                  className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capturar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Canvas oculto para captura */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-center space-x-3">
            <Scan className="w-6 h-6 text-blue-600 animate-pulse" />
            <span className="text-lg font-medium text-gray-900">Processando imagem...</span>
          </div>
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      )}

      {/* Preview dos Recibos */}
      {showPreview && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Recibos Processados ({recibosParsed.length})
            </h2>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {recibosParsed.map((recibo, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-gray-900">{recibo.descricao}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfiancaColor(recibo.confianca)}`}>
                        {recibo.confianca.toFixed(1)}% confiança
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <label className="block text-gray-600 mb-1">Valor</label>
                        <input
                          type="number"
                          step="0.01"
                          value={recibo.valor}
                          onChange={(e) => updateRecibo(index, { valor: parseFloat(e.target.value) })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-600 mb-1">Data</label>
                        <input
                          type="date"
                          value={recibo.data}
                          onChange={(e) => updateRecibo(index, { data: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-600 mb-1">Categoria</label>
                        <select
                          value={recibo.categoria_sugerida || ''}
                          onChange={(e) => updateRecibo(index, { categoria_sugerida: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        >
                          <option value="">Selecionar categoria</option>
                          {categorias.map(categoria => (
                            <option key={categoria.id} value={categoria.id}>
                              {categoria.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {recibo.estabelecimento && (
                      <div className="mt-2 text-sm text-gray-600">
                        <strong>Estabelecimento:</strong> {recibo.estabelecimento}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowPreview(false)}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleImportRecibos}
              disabled={loading}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>Importar {recibosParsed.length} Recibo(s)</span>
            </button>
          </div>
        </div>
      )}

      {/* Instruções */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">📱 Dicas para melhor reconhecimento</h3>
        
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <span><strong>Iluminação:</strong> Certifique-se de ter boa iluminação, evite sombras</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <span><strong>Foco:</strong> Mantenha o recibo plano e bem focado</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <span><strong>Qualidade:</strong> Use imagens de alta resolução para melhor precisão</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <span><strong>Verificação:</strong> Sempre revise os dados extraídos antes de importar</span>
          </div>
        </div>
      </div>
    </div>
  );
}